# OHARA UI Audit Report

Audit date: 2026-08-01
Scope: all UI-bearing TypeScript/TSX, CSS, theme, asset, route, feature, and preview files in `app/`, `components/`, `features/`, `constants/`, `assets/`, `previews/`, `global.css`, and `tailwind.config.js`. API, database, and test-only implementation were inspected only where they clarify UI state. This is a static code audit; no application functionality or source code was changed.

## Executive Summary

OHARA is a responsive Expo Router application targeting web and native. It has a public marketing/authentication experience and an authenticated productivity application centered on goals, projects, Echo entries, notes/reflections, momentum, and a Constellation graph.

The codebase already has a useful primitive layer (`Button`, `Card`, `Input`, `Modal`, `Typography`, `Toggle`, `SegmentedControl`, `Badge`, `Avatar`, `AnchoredPopover`) and a semantic light/dark theme. The principal UI debt is not absence of a design system, but incomplete adoption of it. Five overlapping visual dialects are present:

1. Public/landing warm marketing UI.
2. Main authenticated warm-neutral app UI.
3. Focused dark goal-creation UI.
4. Echo's dense three-pane UI and bespoke typography.
5. Constellation's graph-specific token and inspector system.

The most important consolidation targets are buttons, panel/card shells, form controls, empty/loading/error states, modal actions, segmented controls/pills, and a formal spacing/radius/elevation token scale. The audit found 21 distinct radius values (plus directional radii), more than 40 literal spacing values, numerous one-off shadows, and a large hardcoded color palette alongside the existing semantic theme.

# Application Overview

## Screen Inventory

### Public and authentication routes

| Route | Screen / purpose | Primary file | Layout and notable UI |
|---|---|---|---|
| `/` | Public landing page, or auth callback redirect handling | `app/index.tsx`; `components/landing/LandingPage.tsx` | Public header/footer, hero, feature sections, AI goal preview, momentum chart, responsive public surfaces |
| `/about` | Public About page | `app/about.tsx` | `PublicPageCanvas`, `PublicHeader`, brand artwork, CTA, footer |
| `/(auth)/login` | Sign in | `app/(auth)/login.tsx` | `PublicAuthShell`, bespoke text inputs/actions |
| `/(auth)/signup` | Registration | `app/(auth)/signup.tsx` | `PublicAuthShell`, bespoke text inputs/actions, confirmation state |
| `/(auth)/forgot-password` | Password reset request | `app/(auth)/forgot-password.tsx` | `PublicNav`, standalone centered form and success/error states |
| `/(auth)/reset-password` | Password recovery/update | `app/(auth)/reset-password.tsx` | `PublicNav`, validation, invalid-link, success, and loading states |
| `/(auth)/callback` | Auth callback progress/error redirect | `app/(auth)/callback.tsx` | Minimal centered loading copy |
| `+not-found` | Unknown-route fallback | `app/+not-found.tsx` | Default Expo-style not-found UI; visually outside the OHARA system |
| `/modal` | Template/example modal route | `app/modal.tsx` | Placeholder screen; appears unused and visually outside the product system |

### Authenticated application routes

| Route | Screen / purpose | Primary file | Layout and notable UI |
|---|---|---|---|
| `/(app)/dashboard` | Today/dashboard home | `app/(app)/dashboard.tsx` | Responsive dashboard; active/today goal cards, goal grids, projects, momentum, Echo analysis, quick-action modal, toast |
| `/(app)/momentum` | Momentum analytics | `app/(app)/momentum.tsx` | Summary cards, trend chart, streak calendar/grid, insight modal |
| `/(app)/entries` | Notes and reflections hub | `features/entries/components/EntriesScreen.tsx` | Segmented tab between Notes and Reflections; nested libraries/empty states |
| `/(app)/entries/[id]` | Note or completed reflection detail | `features/entries/components/EntryDetailScreen.tsx` | Note editor or completed reflection view; loading/not-found/error states |
| `/(app)/entries/reflection` | Guided reflection flow | `features/entries/components/GuidedReflection.tsx` | Focused chat flow, picker modal, result state |
| `/(app)/echo` | Echo entry workspace | `features/echo/components/EchoScreen.tsx` | Responsive three-pane tree/list/detail UI; filters, composer, menus, move/create-folder dialogs |
| `/(app)/constellation` | Interactive personal graph | `features/constellation/components/ConstellationScreen.tsx` | Graph canvas, legend, action menu, responsive inspector panels, empty/loading/error states |
| `/(app)/explore` | Explore placeholder | `app/(app)/explore.tsx` | Centered “coming soon” state |
| `/goals/create` | AI/manual goal creation wizard | `app/goals/create.tsx` | Separate responsive shell, optional sidebar, multi-step form, category cards, review/success states |
| `/(app)/goals/[id]` | Goal detail | `app/(app)/goals/[id]/index.tsx` | Goal header, progress/countdown, milestones, trackers, intelligence, analytics, recommendations, activity, project picker and extension dialogs |
| `/(app)/goals/[id]/vault` | Goal evidence vault | `app/(app)/goals/[id]/vault.tsx` | Vault item list/cards, Echo trail, empty/loading/error states, add-item modal |
| `/(app)/projects/[id]` | Project detail | `app/(app)/projects/[id].tsx` | Project summary, goal rows, edit/delete dialogs, empty/loading/error states |
| `/(app)/projects/create` | Standalone project creation | `app/(app)/projects/create.tsx` | Form screen; duplicates part of `CreateProjectModal` |

### Development-only preview routes

`previews/constellation/app/` defines an isolated Expo Router preview application with index, Echo, goal creation, and Constellation fixture routes. It is not part of the production route tree but is a meaningful visual QA surface. `features/constellation/dev/ConstellationFixturePreview.tsx` is its reusable fixture renderer.

## Navigation Structure

- `app/_layout.tsx` is the root stack. It loads fonts/theme/auth state and redirects between the public/auth and authenticated trees. All native headers are disabled.
- `app/(auth)/_layout.tsx` is a headerless auth stack.
- `app/(app)/_layout.tsx` is the authenticated shell. On desktop it renders `Sidebar`; the content area is a headerless stack. `GlobalCreateControl` overlays the shell and opens note/project creation.
- Primary sidebar destinations are Dashboard, Echo, Entries, Momentum, Constellation, and Explore. The sidebar also owns collapse behavior and `AvatarMenu`.
- Dashboard cards deep-link into goals, projects, Momentum, Echo, and goal creation.
- Goal detail links to Vault and goal-filtered Echo. Vault links back into Echo. Project detail links to goal creation with a project parameter.
- Mobile navigation is not a bottom-tab system. The desktop sidebar disappears at responsive thresholds, while individual screens provide local headers/back actions. This makes global destination discovery weaker on narrow screens.
- Public navigation is independent (`PublicHeader`/`PublicNav`) and uses section anchors plus Login/Signup routes.

## Shared Layouts

| Layout | File | Usage | Audit note |
|---|---|---|---|
| Root stack/auth gate | `app/_layout.tsx` | Entire app | Central font and route gate; appropriate root responsibility |
| Auth stack | `app/(auth)/_layout.tsx` | Auth routes | Headerless only; visual layout is rebuilt by individual screens or `PublicAuthShell` |
| Authenticated shell | `app/(app)/_layout.tsx` | All `/(app)` routes | Shared desktop sidebar and global create control |
| `Screen` | `components/layout/Screen.tsx` | No current imports found | Intended page wrapper is effectively unused, so page padding/background/scroll behavior is rebuilt per screen |
| `AppHeader` | `components/layout/AppHeader.tsx` | Goal detail, Vault, goal creation | Reusable local back/title/action header; should be extended to more detail/form screens |
| `PublicAuthShell` | `components/landing/PublicAuthShell.tsx` | Login, Signup | Good shared marketing/auth shell; Forgot/Reset use a parallel construction |
| `PublicPageCanvas` + `PublicHeader` + `PublicFooter` | `components/landing/PublicPrimitives.tsx` | Landing and About | Coherent public layout family |
| Echo pane layout | `features/echo/components/EchoScreen.tsx` | Echo | Feature-specific responsive three-pane shell; justified, but its pane surfaces should use shared shell tokens |
| Constellation canvas/inspector layout | `ConstellationCanvasShell.tsx`; `ConstellationInspectorSurface.tsx` | Constellation | Purpose-built graph layout with explicit responsive behavior and accessibility fallback |

# Component Inventory

“Screens” below refers to the user-visible route where a component ultimately appears. “Consolidation” is an opportunity, not a functionality change recommendation.

## Global UI Primitives

| Component | File location | Current usage / screens | Consolidation opportunity |
|---|---|---|---|
| `Typography` | `components/ui/Typography.tsx` | Used across nearly every public and authenticated screen; 37 named variants | Keep as the canonical type API; remove arbitrary `Text` font sizes over time and split variants into a smaller semantic core plus feature extensions |
| `Button` | `components/ui/Button.tsx` | Goal creation, Constellation inspectors, Entries, Friends, goal review/templates | Adopt for dashboard, auth, Echo, project and goal-detail bespoke `Pressable` buttons; add icon-only, tonal, destructive-outline, and full-width options |
| `Card`, `CardHeader`, `CardSection`, `CardDivider`, `CardTitle`, `CardSubtitle`, `CardMetadata` | `components/ui/Card.tsx` | Dashboard, Momentum, Constellation empty state, Entries, goal review, `ReflectionCard` | Establish card variants (standard, inset, elevated, dark, interactive) so feature cards stop rebuilding borders/radii/shadows |
| `Input` | `components/ui/Input.tsx` | Account modal and Constellation annotation UI | Expand for multiline, search, prefix/suffix, error/help text; migrate auth, project, goal, Friends, Echo, and Entries inputs |
| `Modal` | `components/ui/Modal.tsx` | Momentum, projects, Entries, goals, Constellation evidence, account/settings, quick entry | Canonical dialog shell; migrate raw React Native modals in Dashboard and Vault; provide confirmation/form presets and width sizes |
| `AnchoredPopover` | `components/ui/AnchoredPopover.tsx` | Global create menu, Echo filter/action menus, Constellation action menu | Canonical anchored menu; align `FriendsPopover` shell and `AvatarMenu` menus with it where positioning requirements allow |
| `SegmentedControl` | `components/ui/SegmentedControl.tsx` | Goal creation mode and Entries tabs | Use as the basis for Echo filter pill/tab-like controls; add compact/pill variants rather than parallel segmented styling |
| `Toggle` | `components/ui/Toggle.tsx` | Settings, Friends settings, goal creation/review | Canonical switch; verify native accessibility semantics and use everywhere boolean settings appear |
| `Badge` | `components/ui/Badge.tsx` | Goal cards/rings/detail and project detail | Expand semantic variants for BRT, status, pending/error, category; replace local badge/pill constructions |
| `Avatar` / `getInitials` | `components/ui/Avatar.tsx` | Avatar menu, account, Friends | Canonical person avatar; retain single fallback logic |
| `BrandIcon` | `components/ui/BrandIcon.tsx` | Sidebar, dashboard, Echo, goal/project title rows/cards | Canonical branded image/icon mapping; document sizing/tint behavior |
| `ProgressRing` / web implementation | `components/ui/ProgressRing.tsx`; `ProgressRing.web.tsx` | Goal detail and goal ring cards | Good cross-platform primitive; merge style semantics with Momentum/Today progress visuals |
| `DatePicker` | `components/ui/DatePicker.tsx` | Goal creation, review, countdown, milestone and extension flows | Canonical date control; its internal modal should share field/error conventions with `Input` |
| `BrtPicker` | `components/ui/BrtPicker.tsx` | Echo edit and Constellation inspectors/evidence | Canonical Bud/Rose/Thorn selector; align all BRT badges and graph colors to the same semantic token source |
| `Toast` | `components/ui/Toast.tsx` | Dashboard and goal creation | Generalize status/position/duration; use for other transient save/error feedback instead of local banners where appropriate |
| `EmptyStateCard` | `components/ui/EmptyStateCard.tsx` | Echo entry list and `TodayCarousel` | Expand icon/compact/inline variants; migrate repeated empty cards throughout Goals, Entries, Momentum and projects |
| `ChatMessageList` | `components/ui/ChatMessageList.tsx` | No current production import found | Legacy/general chat rendering; evaluate removal or convergence with focused implementation |
| `FocusedChatMessageList` | `components/ui/FocusedChatMessageList.tsx` | AI goal creation and Guided Reflection | Active focused chat renderer; likely successor to `ChatMessageList` |
| `ReflectionCard` | `components/ui/ReflectionCard.tsx` | Goal activity feed | Reusable reflection item; could also underpin completed-reflection summaries and Echo reflection views |
| `GoalCreationModeToggle` | `components/ui/GoalCreationModeToggle.tsx` | Goal creation | Thin semantic wrapper over `SegmentedControl`; appropriate if copy/values remain stable |
| `TodayGoalCard` / `TodayCarousel` | `components/ui/TodayGoalCard.tsx`; `TodayCarousel.tsx` | No current runtime render found; Dashboard imports only the carousel type | Likely superseded by inline Dashboard implementations; remove or restore as canonical Today components to avoid two versions |

## Shared Layout, Navigation, and Account Components

| Component | File location | Current usage / screens | Consolidation opportunity |
|---|---|---|---|
| `Sidebar` | `components/layout/Sidebar.tsx` | Authenticated desktop shell and desktop goal creation | Canonical desktop navigation; extract shared breakpoint and page offset tokens |
| `AvatarMenu` | `components/layout/AvatarMenu.tsx` | Sidebar | Entry point for account, settings, Friends, and sign out; menu surface can share popover primitives |
| `FriendsPopover` | `features/friends/components/FriendsPopover.tsx` | Opened from `AvatarMenu` | Complex responsive popover/modal with internal rail; share modal/popover sizing/elevation tokens |
| `RailButton` | `features/friends/components/RailButton.tsx` | Friends popover | Feature tab control; could become icon-rail variant of a shared navigation item |
| `FriendsListPane`, `RequestsPane`, `AddPeoplePane` | `features/friends/components/` | Friends popover | Feature panes; share pane header, status, and empty/error state primitives |
| `FriendRow` | `features/friends/components/FriendRow.tsx` | All Friends panes | Good shared list row; formalize row density/action slots |
| `StatCell` | `features/friends/components/StatCell.tsx` | Friends popover | Candidate generic stat/metric cell, also useful in Momentum/goal analytics |
| `AccountModal` | `components/layout/AccountModal.tsx` | Avatar menu | Uses shared Modal/Input/Avatar; align actions with standard modal footer |
| `SettingsPane` / `SettingsModal` | `components/layout/SettingsModal.tsx` | Friends popover / Avatar menu | Two shells around one settings body; good separation, but share section-row primitives |
| `GlobalCreateControl` | `components/layout/GlobalCreateControl.tsx` | Authenticated shell | Floating create button + anchored menu; consolidate elevation with other floating controls |
| `AppHeader` | `components/layout/AppHeader.tsx` | Goal creation/detail/Vault | Expand to project, entry, and other detail screens for consistent back/title/action layout |
| `Screen` | `components/layout/Screen.tsx` | Unused | Either adopt as canonical responsive page container or remove to avoid false standardization |
| `AboutUs` | `components/layout/AboutUs.tsx` | No import found | Legacy placeholder; About is implemented in `app/about.tsx` |

## Landing and Public Components

| Component | File location | Current usage / screens | Consolidation opportunity |
|---|---|---|---|
| `LandingPage` | `components/landing/LandingPage.tsx` | `/` | Composition root; contains several locally defined section patterns that could become public section primitives |
| `PublicButton` | `components/landing/PublicPrimitives.tsx` | Landing/About/Auth shell | Parallel to app `Button`; either retain explicit marketing variant or unify under one Button API with public theme variants |
| `PublicHeader` / `PublicNav` | `PublicPrimitives.tsx`; `PublicNav.tsx` | Landing/About/Auth reset pages | `PublicNav` is only a wrapper; standardize which auth pages use full header vs compact nav |
| `PublicPageCanvas`, `PublicSectionHeading`, `PreviewSurface`, `PublicFooter` | `components/landing/PublicPrimitives.tsx` | Landing/About/previews | Coherent shared public primitives; keep scoped but source colors/radii/elevation from formal public tokens |
| `BrandArtwork` | `components/landing/BrandArtwork.tsx` | Landing, About, Auth shell | Reusable brand-art composition |
| `AIGoalCreationPreview` | `components/landing/AIGoalCreationPreview.tsx` | Landing | Marketing-only mock UI; should use preview-specific tokens, not production component assumptions |
| `PublicMomentumTrendChart` | `components/landing/PublicMomentumTrendChart.tsx` | Landing | Duplicates chart concepts from `MomentumTrendChart`; share data-to-path/chart primitives while retaining marketing presentation |
| `GoalTree` | `components/landing/GoalTree.tsx` | No current import found | Unused SVG illustration; document intended placement or remove after confirmation |
| `PublicConstellation` | `components/constellation/PublicConstellation.tsx` | No current import found | Marketing constellation illustration; potentially superseded by current landing sections |
| `AffiliateTeaser` | `components/AffiliateTeaser.tsx` | No current import found | Unused promotional component |

## Goal and Project Components

| Component(s) | File location | Current usage / screens | Consolidation opportunity |
|---|---|---|---|
| `GoalCard`, `GoalGrid` | `features/goals/components/GoalCard.tsx`; `GoalGrid.tsx` | Dashboard (`GoalCard`); `GoalGrid` has no current import | GoalCard has multiple display states and bespoke menu/shadow; separate shell/action menu and eliminate inactive grid wrapper if obsolete |
| `GoalRingCard`, `GoalRingGrid` | `features/goals/components/GoalRingCard.tsx`; `GoalRingGrid.tsx` | Dashboard | Parallel compact goal card family; share goal-card base, title, badge, progress, and interaction states with `GoalCard` |
| `GoalTitleRow`, `ProjectTitleRow` | `features/goals/components/GoalTitleRow.tsx`; `features/projects/components/ProjectTitleRow.tsx` | Dashboard/detail/cards | Nearly identical title-with-brand-icon patterns; consolidate into a generic branded title row |
| `ProjectCard`, `ProjectGoalRow` | `features/projects/components/ProjectCard.tsx`; `features/goals/components/ProjectGoalRow.tsx` | Dashboard and project detail | Share card shell/interactive row primitives; row could be generic progress-list item |
| `CreateProjectModal` | `features/projects/components/CreateProjectModal.tsx` | App shell and Dashboard | Duplicates standalone project create screen; extract one `ProjectForm` used by both |
| `GoalDetailHeader` | `features/goals/components/GoalDetailHeader.tsx` | Goal detail | Composite hero with progress/status/actions/extension modal; source shadow/radius from panel variants |
| `CountdownTimer` | `features/goals/components/CountdownTimer.tsx` | Goal detail | Bespoke timer card and edit popover; share panel shell and DatePicker field behavior |
| `MilestonesPanel`, `TrackersPanel`, `TrackerCard` | `features/goals/components/` | Goal detail | Repeated panel headers, add/edit forms, empty states and elevation; create `GoalDetailPanel`, `InlineEditor`, and shared empty state |
| `IntelligencePanel`, `AnalyticsPanel`, `RecommendedPanel` | `features/goals/components/` | Goal detail | Parallel analytic panels; standardize shell, heading, loading/error/empty presentation |
| `GoalEchoAnalysisCard` | `features/goals/components/GoalEchoAnalysisCard.tsx` | Dashboard, Momentum, Intelligence panel | Good shared insight card; formalize compact/full variants |
| `WhatYouBuiltPanel`, `SuccessorReflectionPanel` | `features/goals/components/` | Completed/extended goal detail | Specialized summary panels; share detail-panel shell |
| `ActivityFeed` | `features/goals/components/ActivityFeed.tsx` | Goal detail | List/loading/error/empty patterns should use common state primitives |
| `GoalProjectPickerModal` | `features/goals/components/GoalProjectPickerModal.tsx` | Goal detail | Standard selection-dialog candidate |
| `ExtendGoalModal` | `features/goals/components/ExtendGoalModal.tsx` | Goal detail header | Large bespoke wizard inside shared Modal; align form fields, steps, and footer actions with goal creation |
| `VaultItemCard`, `EchoTrail` | `features/goals/components/` | Vault | Multiple nested card/badge/action patterns; share evidence-card and BRT/status primitives with Constellation and Echo |
| `AIGoalCreation` | `features/goals/components/AIGoalCreation.tsx` | Goal creation | Orchestrates focused chat, templates, drafts and review |
| `GoalTemplateCards`, `EchoGoalDraftCards`, `GoalReviewScreen` | `features/goals/components/` | AI goal creation | Three bespoke selectable/review card families; converge on selection-card and review-section primitives |

## Echo Components

| Component(s) | File location | Current usage / screens | Consolidation opportunity |
|---|---|---|---|
| `EchoScreen` | `features/echo/components/EchoScreen.tsx` | Echo | Feature composition root |
| `EchoContainerTree` | `features/echo/components/EchoContainerTree.tsx` | Echo left pane | Tree rows and nested entry rows; share selected/hover row tokens with Sidebar/list primitives |
| `EchoEntryList`, `EchoEntryRow` | `features/echo/components/` | Echo center pane/tree | Reusable dense entry list; centralize row height, typography and selected/hover state |
| `EchoDetailPane` | `features/echo/components/EchoDetailPane.tsx` | Echo right pane | Detail/empty/edit/composer switcher; use shared detail-header and empty-state primitives |
| `EchoComposer` | `features/echo/components/EchoComposer.tsx` | Echo detail and `QuickEntryModal` | Rich bespoke form; migrate field labels/banners/buttons to common form/status primitives |
| `EchoEntryEditForm` | `features/echo/components/EchoEntryEditForm.tsx` | Echo detail | Repeats composer fields/actions; share an entry form core |
| `EchoFilterPill` | `features/echo/components/EchoFilterPill.tsx` | Echo toolbar | Anchored filter selector; align pill dimensions/radius with Badge/SegmentedControl |
| `EntryActionMenu` | `features/echo/components/EntryActionMenu.tsx` | Echo entry row | Shared anchored action-menu opportunity for goal/project cards too |
| `GoalFolderPicker` | `features/echo/components/GoalFolderPicker.tsx` | Composer, move dialog | Reusable grouped selector; candidate generic hierarchical select |
| `CreateFolderModal`, `MoveEntryModal` | `features/echo/components/` | Echo | Raw React Native `Modal` implementations; migrate to shared Modal and standard footer |
| `QuickEntryModal` | `features/echo/components/QuickEntryModal.tsx` | No current import found | Intended global quick entry, apparently superseded by navigation to Entries; verify before removal |
| `EchoPaneResizer` | `features/echo/components/EchoPaneResizer.tsx` | Echo desktop | Purpose-built resizer; retain, but tokenise hit area/divider/hover state |

## Entries and Reflection Components

| Component(s) | File location | Current usage / screens | Consolidation opportunity |
|---|---|---|---|
| `EntriesScreen`, `EntriesSegmentedControl` | `features/entries/components/` | Entries | Composition root and semantic segmented wrapper; consistent reuse |
| `NotesLibrary` | `features/entries/components/NotesLibrary.tsx` | Entries Notes tab | Contains toolbar, list/cards, creation, delete dialog, empty/loading/error states; extract entry row/card and library state primitives |
| `ReflectionsLanding` | `features/entries/components/ReflectionsLanding.tsx` | Entries Reflections tab | Reflection type cards and recent list; share selection cards with goal creation |
| `EntryDetailScreen` | `features/entries/components/EntryDetailScreen.tsx` | Entry detail | Router-facing state switcher; use AppHeader/page container |
| `NoteEditor` | `features/entries/components/NoteEditor.tsx` | Entry detail | Toolbar, title field, rich editor, link picker, export/delete dialogs; share modal footer/status controls |
| `RichTextEditor` / web implementation | `features/entries/components/RichTextEditor.tsx`; `.web.tsx` | Note editor | Correct platform split; type styles also exist in `global.css`, so keep editor typography tokens together |
| `EntryLinkPicker` | `features/entries/components/EntryLinkPicker.tsx` | Note editor | Selection-dialog pattern shared with GoalProjectPicker/GoalFolderPicker |
| `GuidedReflection` | `features/entries/components/GuidedReflection.tsx` | Guided reflection | Focused chat and modal selector; shares dark focused language with AI goal creation |
| `CompletedReflection` | `features/entries/components/CompletedReflection.tsx` | Entry detail | Summary/export/delete UI; share reflection card and detail shell |

## Constellation Graph Components

| Component(s) | File location | Current usage / screens | Consolidation opportunity |
|---|---|---|---|
| `ConstellationScreen` | `features/constellation/components/ConstellationScreen.tsx` | Constellation | Composition/state root |
| `ConstellationCanvasShell` | same directory | Constellation and fixture preview | Canonical graph canvas/viewport/gesture renderer; keep feature-specific |
| `ConstellationEdge`, `InteractiveEdgeGroup` (+ web) | same directory | Canvas | Graph edge rendering and platform event adapters; keep feature-specific |
| `EarnedNodeShape`, `GoalCategoryShape`, `VirtualBrtClusterShape`, `AnnotationShape` | same directory | Canvas | Node renderers; share selection, accessible label, and token contracts |
| `SelectionRing`, `SproutedLabel` | same directory | Canvas | Graph adornments; keep feature-specific |
| `InteractiveSvgGroup` (+ web) | same directory | Canvas node shapes | Platform interaction adapter; keep feature-specific |
| `ConstellationLegend` | same directory | Canvas | Graph legend; style as a reusable graph overlay surface |
| `ConstellationHeaderMetadata`, `ConstellationActionMenu` | same directory | Canvas header | Metadata/action controls; action menu correctly reuses AnchoredPopover |
| `ConstellationAccessibleList` | same directory | Canvas accessibility fallback | Important semantic parallel view; retain |
| `ConstellationInspectorSurface` | same directory | All inspectors/panels | Strong shared inspector shell; extend to eliminate repeated inspector form rows |
| `ConstellationBrtInspector`, `ConstellationGenericInspector`, `ConstellationGoalCategoryInspector`, `ConstellationReflectionInspector` | same directory | Inspector | Specialized inspector bodies; standardize metadata row and state sections |
| `ConstellationAnnotationPanel`, `ConstellationGoalEvidencePanel`, `ConstellationGoalLinkPanel` | same directory | Inspector | Form-heavy panels; share inspector field/action/error primitives |
| `ConstellationEmptyState`, `ConstellationSeedPreview` | same directory | Empty graph | Feature-specific empty state; shell/card/action treatment can use global state standards |
| `ConstellationLoadingMark` | same directory | Graph and inspectors | Feature-specific animated loading glyph; pair with a shared loading-state wrapper |
| `ConstellationFixturePreview` | `features/constellation/dev/ConstellationFixturePreview.tsx` | Preview router only | Valuable visual QA harness; keep dev-only |

## Charts, Graphs, Lists, Empty and Loading States

| Component | File location | Current usage / screens | Consolidation opportunity |
|---|---|---|---|
| `MomentumTrendChart` | `features/momentum/components/MomentumTrendChart.tsx` | Dashboard and Momentum | Canonical authenticated line/area trend chart; share geometry, responsive frame, state handling and accessibility with the public chart |
| `PublicMomentumTrendChart` | `components/landing/PublicMomentumTrendChart.tsx` | Landing | Marketing treatment of the same chart concept; retain public styling while sharing chart mechanics |
| `ProgressRing` | `components/ui/ProgressRing.tsx`; `ProgressRing.web.tsx` | Goal ring cards and goal detail | Canonical circular progress primitive; align dashboard inline rings and semantic progress colors with it |
| `ConstellationCanvasShell` and node/edge renderers | `features/constellation/components/` | Constellation and fixture preview | Purpose-built interactive graph; retain feature architecture and reuse global shell/state/form tokens around it |
| `PublicConstellation` | `components/constellation/PublicConstellation.tsx` | No current import found | Marketing graph illustration; verify whether it is obsolete or intended for a future landing section |
| `GoalTree` | `components/landing/GoalTree.tsx` | No current import found | Marketing SVG graph/tree illustration; verify before cleanup |

- Additional inline data visuals live in Dashboard and Momentum, including progress rings, streak/day cells, and summary bars. These should use the same semantic chart/progress tokens.
- Reusable lists: `EchoEntryList`, `EchoContainerTree`, `FriendsListPane`, `RequestsPane`, `ActivityFeed`, `GoalGrid`, `GoalRingGrid`, `ProjectGoalRow`, `NotesLibrary`, `EchoTrail`, and `ConstellationAccessibleList`.
- Explicit shared empty state: `EmptyStateCard`. Feature-local empty states occur in Dashboard, Momentum, Echo detail/list/tree, Entries/Notes/Reflections, Goal grids/detail panels, Vault, Projects, Friends panes, and Constellation. Most are locally assembled from `View`/`Typography`/`Button`.
- Explicit loading components: `ConstellationLoadingMark` and button/activity indicators inside `Button`/`Modal`. Elsewhere loading is represented by local `ActivityIndicator`, skeleton-like text, or centered copy. There is no canonical page, panel, list, or inline loading-state component.
- There is no dedicated general Tabs component; `SegmentedControl`, `EntriesSegmentedControl`, Friends rail buttons, Echo filter pills, and Sidebar navigation cover related but separately styled interaction patterns.
- There is no dropdown/select primitive. `GoalFolderPicker`, `EntryLinkPicker`, `GoalProjectPickerModal`, `EchoFilterPill`, DatePicker, and locally built choice lists provide overlapping selection behavior.

# Theme Audit

## Theme Architecture

1. `constants/colors.ts` defines semantic `LIGHT_THEME` and `DARK_THEME` objects used through `useThemeColors()`.
2. `tailwind.config.js` defines a second named palette and the main/feature typography scales used by NativeWind classes.
3. `constants/themes.ts` defines goal gradients and category accent palettes.
4. `constants/focused-tokens.ts` defines the focused dark goal/reflection field.
5. `components/landing/PublicPrimitives.tsx` defines `PUBLIC_COLORS`, a public-site palette overlapping Tailwind `lp-*` colors.
6. `features/constellation/visual-tokens.ts` derives semantic graph tokens from the app theme; this is the best-isolated feature token system.
7. Component-local literals and `global.css` add a substantial untracked layer.

## Semantic App Color Tokens

| Group | Token | Light | Dark |
|---|---|---:|---:|
| Background | `page` | `#F7F4EE` | `#141414` |
| | `card` | `#FFFFFF` | `#202020` |
| | `sidebar` | `#EEE9DF` | `#1A1A1A` |
| | `input` | `#F0EDE6` | `#101010` |
| | `subtle` | `#EAE7E0` | `#0D0D0D` |
| | `goalCard` | `#FCFAF4` | `#121212` |
| | `selectedRow` | `#EEF2EF` | `#222A23` |
| Text | `primary` | `#24231F` | `#FFFFFF` |
| | `secondary` | `#5F5B52` | `#B8B8B8` |
| | `inverse` / `onAccent` | `#EDE7DA` | `#F1F0ED` / `#111111` |
| | `accent` | `#4A7C5F` | `#8FAE8A` |
| | `muted` / `mutedOnDark` | `#7C766B` / `#9C9483` | `#A3A3A3` / `#8F8F8F` |
| Border | `default` / `subtle` | `rgba(0,0,0,.06)` / `.04` | `rgba(255,255,255,.06)` / `.04` |
| | `accent` | `#4A7C5F` | `#8FAE8A` |
| | `warm` / `warmSubtle` | `#EDE6D8` / `#EFE9DC` | `#292929` / `#313131` |
| | `input` / `divider` | `#D8D2C8` / `#D8D1C5` | `#202020` / `#2D2D2D` |
| | `toggleGlyph` | `#A8C4AE` | `#272D29` |
| BRT | `bud` / `rose` / `thorn` | `#4A7C5F` / `#F59E0B` / `#EF4444` | `#8FAE8A` / `#F8B950` / `#F48181` |
| Accent | `primary` | `#4A7C5F` | `#8FAE8A` |
| | `teal` / `tealSubtle` | `#6FDFB8` / `#E8F5EF` | `#88E5C4` / `#FAFDFB` |
| | `tealMid` / `tealSoft` | `#2F8F6D` / `#9FD9C4` | `#38AA81` / `#B5E2D1` |
| Danger | text/bg/border | `#C0483A` / `#FCECEA` / `#F0B8AE` | `#D3796E` / `#2B1613` / `#5C3129` |
| Pending | text/bg/border | `#B45309` / `#FFFBEB` / `#FDE68A` | `#F37311` / `#29230F` / `#FEF3C6` |
| Info | text/bg/border | `#5F6B66` / `#F8F5EF` / `#E4DDCB` | `#B8BDB4` / `#1D1F1C` / `#33362F` |
| Effects | overlay/shadow | `rgba(36,35,31,.24)` / `#1E3226` | `rgba(0,0,0,.48)` / `#000000` |

## Tailwind and Public Color Tokens

- Core/legacy: `cream #FAF9F6`, `near-black #211F1A`, `earth-green #2D6A4F`, `earth-green-dark #1E4D38`, `card-bg #F3F1EC`, `muted #8A8172`, `border-color-subtle #EAE7E0`.
- Authenticated redesign: `page-bg #F8F4EC`, `ink-muted #A79E8E`, `ink-on-dark #EDE7DA`, `ink-muted-on-dark #9C9483`, `emerald-deep #1E3226`, `emerald-active #2A4436`, `nav-inactive #8FA294`, `teal-bright #6FDFB8`, `teal-mid #2F8F6D`, `teal-soft #9FD9C4`, `goal-card #FCFAF4`, `border-warm #EDE6D8`, `border-warm-subtle #EFE9DC`, `toggle-glyph #A8C4AE`.
- App dark: `dark-bg #111111`, `dark-card #1A1A1A`, `dark-border #2D2D2D`.
- Legacy landing dark: `landing-dark-bg #0A0A0F`, `landing-dark-card #14141F`, `landing-dark-border #1E1E2E`, `ink #FAFAFA`, `landing-ink-dim #8888A0`, `landing-primary #6E5CE7`.
- Current landing: `lp-bg #F5F1EA`, `lp-ink #211F1A`, `lp-muted #6B6B6B`, `lp-green #3D5247`, `lp-green-hover #2A3B31`, `lp-green-medallion #24312A`, `lp-teal #6FDFB8`, `lp-amber #E09F3E`, `lp-card #FFFFFF`, `lp-border #E4DED0`, `lp-border-strong #D8D2C4`, `lp-panel-green #EEF3EE`, `lp-panel-teal #EAF7F0`, `lp-panel-amber #FBF1E1`.

`PUBLIC_COLORS` repeats much of the `lp-*` family in `PublicPrimitives.tsx`. This is an immediate single-source-of-truth opportunity.

## Goal and Focused Color Tokens

- Goal gradients (`constants/themes.ts`): Ocean `#0A2342/#1B4965/#5FA8D3`; Sunset `#6B2737/#D4A373/#FEFAE0`; Forest `#1B4332/#2D6A4F/#52B788`; Lavender `#2B2D42/#8D99AE/#D6BCFA`; Ember `#3D0814/#9D0208/#E85D04`; Mint `#0B3D2E/#1B7A5A/#6FDFB8`; Slate `#1E293B/#475569/#94A3B8`; Coral `#4A1942/#C84B6B/#FF8A80`.
- Category accents: Health `#34B87A/#2A9564/#E5F4EC`; Finance `#3B82C4/#2E6BA5/#E6EFF7`; Career `#E8853D/#C86D28/#FBEDDF`; Creative `#9B5DE5/#7C43C4/#F0E7FA`; Education `#2CAAA1/#218C85/#E1F1EF`; Relationships `#E85D75/#C7455F/#FCE6EC`; Growth `#D4A843/#B4892E/#F6EBD3`. Each also defines a translucent shadow and warm page background.
- Focused field (`constants/focused-tokens.ts`): surfaces `#1A1A1A/#161616/#1D1D1D/#222A23`; borders `#262626/#2D2D2D`; text `#EDE7DA/#B8B8B8/#8F8F8F/#6B6B6B`; accent `#34B87A` on `#0B0B0B`; radii `16/12`.

## Hardcoded and Duplicate Colors

Hardcoded literals remain in route and component files even when semantic equivalents exist. The most repeated are `#8A8172` (19 occurrences), `#1E3226` (16), `#A79E8E` (15), `#FFFFFF` (13), `#211F1A` (12), `#D8D2C4` (11), black variants (10+), `#D8D2C8` (9), `#4A7C5F` (9), `#EDE7DA` (7), `#E7DEC9` (7), and `#6FDFB8` (7).

The complete additional literal palette found outside the semantic table includes:

`#E7DEC9`, `#6B6257`, `#9A8A6E`, `#4A4339`, `#F6F0E4`, `#D8E3DA`, `#D8D0C2`, `#8A6A3E`, `#9C6B5C`, `#8FAE94`, `#EEC488`, `#7A4E42`, `#5A5142`, `#2E6B52`, `#F8F6F1`, `#EFEAE2`, `#EEF4F0`, `#E8EFE9`, `#E8EDE9`, `#E3EAE4`, `#DDD6CA`, `#BFD0C3`, `#B97A1E`, `#B7A99C`, `#B79A6A`, `#AFC0B4`, `#A8B9AE`, `#9BAA9F`, `#6B7F6E`, `#4A4237`, `#3F8F63`, `#3A3A3A`, `#35634A`, `#2E78B7`, `#234434`, `#FC5200`, and `#EEE`.

Additional alpha literals include black overlays at `.50/.40/.25`, white at `.94/.96/.13`, warm neutral and green overlays, and focus rings such as `rgba(74,124,95,.18/.20)`. Many are valid effect variants but should be named (`overlay.scrim`, `focusRing`, `hoverTint`, `elevationTint`) rather than repeated.

Notable duplicates/near-duplicates:

- Page backgrounds: `#F7F4EE`, `#F8F4EC`, `#F5F1EA`, `#F8F5EF`, `#F8F6F1`, and several category page backgrounds.
- Dark surfaces: `#0A0A0F`, `#0D0D0D`, `#101010`, `#111111`, `#121212`, `#141414`, `#14141F`, `#161616`, `#1A1A1A`, `#1D1D1D`, `#202020`.
- Primary ink: `#211F1A`, `#24231F`, `#1E3226`, black forms.
- Warm borders: `#D8D1C5`, `#D8D2C4`, `#D8D2C8`, `#D8D0C2`, `#DDD6CA`, `#E4DED0`, `#E7DEC9`, `#EAE7E0`, `#EDE6D8`, `#EFE9DC`.
- Muted text: `#5F5B52`, `#6B6257`, `#6B6B6B`, `#7C766B`, `#8A8172`, `#9A8A6E`, `#A79E8E`.
- Accent green: `#2D6A4F`, `#34B87A`, `#3D5247`, `#4A7C5F`, `#6FDFB8`, `#8FAE8A`—some semantic distinctions exist, but names are not consistently used at call sites.

## Typography Styles

Fonts loaded at root are Inter Regular/Medium/SemiBold/Bold/ExtraBold, Lora Regular/Italic, and Space Mono. Web also loads Instrument Serif from Google Fonts. Tailwind's base sans is Inter.

The Tailwind scale is `9/12`, `10/14`, `12/16`, `13/18`, `15/22`, `17/24`, `20/28`, `24/32`, `30/38`, and `36/44` px. Echo adds `10.5/14`, `12/16`, `13.5/18`, `13.5/20`, `15/27`, `16/22`, and `26/34`.

`Typography.tsx` defines 37 variants. Core variants include heading, title, body, label, field-label, caption, AI copy, eyebrow, greeting, metadata, navigation, section headings, descriptions, badges, and goal/card variants. Echo adds nine feature-specific variants to the global component. Arbitrary class sizes (`11`, `13`, `14`, `14.5`, `15`, `15.5`, `17`, `27`) coexist with the Tailwind scale.

Inconsistencies:

- Marketing uses Instrument Serif/Lora-like editorial display styles while authenticated screens favor Inter; this is intentional, but ownership is scattered between root font loading, web HTML, and local styles.
- Many files use raw React Native `Text` and inline `fontSize`, bypassing `Typography`.
- The global Typography API is becoming a catalog of screen-specific variants rather than a concise semantic scale.
- Echo has its own exact scale embedded into global Tailwind and Typography configuration.
- Rich text editor headings define separate `30px` and `22px` CSS styles.

Recommended type structure: display, page title, section title, card title, body, body-small, label, caption, overline, mono/data; allow feature aliases to map to these tokens without adding component-global variants.

## Radius Values

Literal radii found: `3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 36, 44, 260, 999`, plus directional top radii of `20`. The most frequent are `999` (pill/circle), `10`, `12`, `9`, `14`, and `16`.

A proposed semantic scale is: `xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 20/24`, `round 999`. Values 9/10/11/13/14/15/18/36/44 should be justified by a named component token or normalized.

## Shadow and Elevation Values

There is no central elevation scale. Observed shadow recipes include:

- Card: y2, blur12, opacity .04, elevation 1.
- Project/goal rows: y2, blur6–12, opacity .04.
- Floating create: y3–4, blur10–14, opacity .08–.10.
- Goal creation cards: y2–8, blur6–18, opacity .035–.12.
- Detail panels: y4, blur22, opacity .05; Intelligence uses .12.
- Menus/popovers: y4 blur14 .10; Friends y20 blur48 .22 elevation24.
- Dialogs: y24 blur30/60 .25 elevation12; goal header menu y16 blur44 .20.
- Timer hero: y8 blur24 .14.
- Toast: y3 blur8 .16 elevation4.

Colors alternate among semantic shadow, primary text, sidebar background, `#000`, and `#000000`. Web `boxShadow` and native shadow props are sometimes paired and sometimes not. Introduce `elevation.none/sm/md/lg/overlay` as platform-resolved recipes.

## Blur Usage

No actual blur/backdrop-blur component or `BlurView` is used. “Blur” appears only as shadow radius and input `onBlur` handlers. Overlays are opaque/translucent scrims. If frosted surfaces are desired later, they would be a new design behavior rather than standardization of current UI.

## Spacing Values

Literal margin/padding/gap values found: `0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 24, 26, 28, 30, 32, 34, 36, 40, 48, 50, 56, 60, 64, 76, 80, 90, 94, 100, 104`. The dominant values are 8, 10, 12, 14, 16, 20, and 24.

This is effectively a loose 2px system with many exceptions, not an explicit spacing scale. Recommended base tokens: `0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64`; treat larger values as named layout dimensions rather than spacing tokens. Responsive page gutters, sidebar width, panel gaps, and modal padding should be separate layout tokens.

# Design Consistency Audit

## Buttons

- Shared `Button` offers primary/secondary/ghost/danger and compact/default, but many screens build buttons directly from `Pressable`.
- Auth/public buttons use `PublicButton` or bespoke form buttons with different heights, radii, typography, and hover states.
- Echo toolbar and entry actions, Dashboard CTAs, goal/project card actions, modal footers, icon buttons, and Constellation overlays all implement distinct pressed/disabled states.
- Icon-only buttons lack a shared size/hit-target/focus-ring contract.
- Destructive actions vary between red text links, tinted buttons, and modal footer buttons.

## Cards and Panels

- Shared `Card` is white/theme-card, radius 16, 1px divider border, optional subtle elevation.
- Goal cards, project cards, goal ring cards, dashboard section cards, detail panels, Echo panes, marketing preview surfaces, and Constellation inspectors each rebuild shells.
- Radii range from 8 to 24 for conceptually equivalent cards; shadows vary from none to heavy elevation.
- Some panels use border-only hierarchy, others background contrast, others shadow, and some combine all three.
- Goal-detail panels use repeated but not identical y4/blur22 shadows, suggesting an unextracted panel recipe.

## Inputs and Selection Controls

- Shared `Input` has label/error support but limited adoption.
- Auth fields, goal creation fields, project forms, Echo composer/edit fields, Friends search, notes title/editor, and Constellation forms use parallel TextInput styling.
- Focus rings and errors are inconsistent across web/native and public/app surfaces.
- “Dropdown” behavior is split across popovers, full dialogs, inline lists, segmented controls, and pills with no shared selection contract.

## Spacing and Layout

- Page gutters and section spacing are set independently in most route roots because `Screen` is unused.
- Desktop breakpoints and maximum content widths are component-local.
- Cards commonly use 16/20/24 padding, but dense Echo and Friends surfaces introduce many 6–14px values without a named density system.
- Mobile header/back treatment differs between Goal, Project, Entry, Vault, Echo, and creation screens.

## Typography

- The canonical component is widely used, but local arbitrary sizes remain common.
- Similar titles may be 14.5, 15, 15.5, 16, or 17px depending on feature.
- Section labels alternate among uppercase tracked eyebrow, semibold title, and plain label treatments.
- Muted text frequently uses hardcoded warm grays instead of semantic `secondary`/`muted`.

## Shadows and Borders

- Borders use both solid warm tokens and alpha black/white tokens without a clear surface rule.
- Default border colors vary among `divider`, `input`, `warm`, `warmSubtle`, and hardcoded near-duplicates.
- Elevated cards do not share one recipe; platform parity varies.
- Several popovers/dialogs are dramatically more elevated than other overlays, without an explicit z/elevation system.

## Graph and Chart Styles

- `MomentumTrendChart` and `PublicMomentumTrendChart` independently implement similar line/area chart concepts.
- Dashboard embeds additional ring/progress/streak visuals outside a chart primitive system.
- Constellation is internally coherent because its visual tokens derive from the theme, but BRT colors and edge semantics should be documented alongside non-graph BRT badges.
- Charts do not share axis, grid, tooltip, empty, loading, or responsive-container primitives.
- Marketing charts intentionally use the public palette, but geometry/data mapping can still be shared.

## States and Feedback

- Empty, loading, error, not-found, saved, pending, and success states are implemented repeatedly.
- `EmptyStateCard` is underused.
- Some loading states show spinners, some text, some animated marks, and some blank/disabled content.
- Error presentation ranges from inline red text to banners to full cards/modals.
- Disabled/pressed/focused/hover states are not consistently available across hand-built controls.

# Technical Debt

## Duplicate or Overlapping Components

- `ChatMessageList` vs `FocusedChatMessageList`.
- Inline Dashboard Today cards vs `TodayGoalCard`/`TodayCarousel`.
- `GoalCard` vs `GoalRingCard`, plus several inline dashboard goal-card forms.
- `GoalGrid` vs `GoalRingGrid`.
- `GoalTitleRow` vs `ProjectTitleRow`.
- `CreateProjectModal` vs `app/(app)/projects/create.tsx`.
- `PublicButton` vs shared `Button` vs numerous local Pressables.
- `PublicMomentumTrendChart` vs `MomentumTrendChart`.
- `CreateFolderModal`/`MoveEntryModal` and raw Dashboard/Vault modals vs shared `Modal`.
- `GoalProjectPickerModal`, `EntryLinkPicker`, `GoalFolderPicker`, and other choice dialogs.
- Repeated goal-detail panel shells and state presentations.
- `AboutUs`, `AffiliateTeaser`, `GoalTree`, `PublicConstellation`, `QuickEntryModal`, `ChatMessageList`, `GoalGrid`, `TodayGoalCard`, and `TodayCarousel` have no clear current production usage.

## Inline Styles

Inline style objects are pervasive across nearly all screens and feature components. Dynamic inline styles are appropriate for theme/responsive/data-driven values, but static declarations dominate many files. The largest concentrations are Dashboard, goal creation, goal detail, Vault, Momentum, project detail, Friends popover, goal components, and Constellation inspectors.

Consequences:

- Repeated visual recipes are hard to discover and update.
- Static and dynamic concerns are mixed.
- Native/web state parity is difficult to verify.
- Theme token adoption cannot be enforced mechanically.
- Large screen files contain both workflow logic and hundreds of lines of presentation details.

Static layout recipes should move to named StyleSheets or shared components; dynamic colors/dimensions should remain at call sites or be resolved by token-aware hooks.

## Components That Should Be Shared

Highest-value extractions:

1. `PageContainer` / `DetailPageLayout` with responsive gutter, width, background, scroll, loading/error scaffolding.
2. `Panel` variants for standard, inset, elevated, interactive, dark, and inspector surfaces.
3. `IconButton` and `MenuItem` based on `Button`/`AnchoredPopover`.
4. `FormField`, `TextArea`, `SearchInput`, and shared help/error/banner primitives based on `Input`.
5. `SelectionDialog` and `SelectList` for project/goal/folder/link/date-adjacent pickers.
6. `EmptyState`, `LoadingState`, `ErrorState`, and `InlineStatus` with page/panel/list/compact variants.
7. `MetricCell`/`StatCard` for Friends, Momentum, and Analytics.
8. `BrandedTitleRow` for goal/project titles.
9. `GoalCardBase` with compact/ring/full variants.
10. `GoalDetailPanel` for milestones, trackers, intelligence, analytics, recommendations, and summaries.
11. `ProjectForm` shared by modal and route.
12. Chart primitives for responsive frame, line/area path, grid/axis, tooltip, and empty/loading states.

## Styling That Should Move into Theme Tokens

- Public palette and public surface recipes.
- Page gutter/max-width/sidebar dimensions and responsive breakpoints.
- Spacing scale and density modes.
- Radius scale and named component radii.
- Cross-platform elevations/shadows.
- Focus ring, hover tint, pressed opacity, disabled opacity.
- Overlay/scrim levels and z-index/elevation tiers.
- Control heights and icon-button hit targets.
- Semantic success/warning/pending/info colors (success is currently conflated with accent/Bud).
- Chart grid, axis, series, fill, tooltip, and selection colors.
- Editor heading/body/blockquote/link styles.
- Pane divider/resizer colors and hover states.

# Refactor Opportunities

The following recommendations preserve behavior and can be delivered incrementally.

## Priority 0: Establish the Source of Truth

- Keep `constants/colors.ts` as the semantic runtime theme source.
- Generate or reference Tailwind colors from the same definitions where tooling permits; eliminate duplicated `PUBLIC_COLORS`/`lp-*` values.
- Add typed spacing, radius, control-size, layout, motion, and elevation tokens.
- Publish a short token usage contract: semantic tokens at component call sites; raw palette only inside token definitions, brand illustrations, and data/category palettes.

## Priority 1: Standardize Primitives

- Expand `Button` with icon-only, tonal, outline, full-width, and public/marketing appearances while retaining one interaction contract.
- Expand `Input` into a form-field family with search, multiline, prefix/suffix, help/error, focus, and disabled states.
- Add `Panel`/Card variants instead of creating additional card components.
- Add modal sizes and standard form/confirmation footers to `Modal`.
- Add shared page/panel/list state components.
- Add selection-list/dialog primitives.

## Priority 2: Consolidate High-Duplication Features

- Unify `GoalCard`/`GoalRingCard`/Dashboard goal cards behind one composable base.
- Extract `ProjectForm` for modal and standalone route.
- Converge chat lists after confirming whether the general renderer is obsolete.
- Migrate Echo folder/move dialogs and Dashboard/Vault raw modals to shared Modal.
- Consolidate Goal/Project title rows.
- Extract a common goal-detail panel shell.
- Decide whether unused/superseded components should be restored as canonical implementations or removed in a separate, explicitly approved cleanup.

## Priority 3: Normalize Screens

- Adopt a shared page container and `AppHeader` pattern across detail/form screens.
- Define mobile authenticated navigation deliberately; the current sidebar-only global navigation leaves narrow layouts dependent on local route flow.
- Standardize page, panel, list, and inline empty/loading/error states.
- Normalize auth routes under `PublicAuthShell` or a clearly documented compact auth layout variant.
- Bring not-found and placeholder routes into OHARA branding.

## Priority 4: Charts and Specialized Systems

- Share chart geometry and responsive framing between public and authenticated momentum charts while preserving their distinct themes.
- Define chart tokens and data-visualization accessibility rules.
- Keep Constellation's feature token adapter, but map all BRT/status semantics to one source and reuse global state/form primitives in inspectors.
- Add visual regression coverage for public, light/dark app, focused dark, Echo density, and Constellation at desktop/mobile breakpoints.

## Suggested Sequencing and Risk

1. Add tokens and component variants without changing call sites.
2. Migrate low-risk leaf components (badges, buttons, modal footers, state cards).
3. Migrate repeated feature panels/forms.
4. Consolidate component implementations only after visual snapshots confirm parity.
5. Remove unused components only after runtime/preview/product-owner confirmation.

The main risk is treating intentional contexts as accidental inconsistency. Public marketing, focused creation, dense Echo, and Constellation should retain distinct personalities. Consolidation should target interaction behavior, semantic tokens, layout rhythm, accessibility, and reusable shells—not force every surface into one visual treatment.

# Audit Conclusion

OHARA has enough foundational primitives to support a coherent design system without an architectural rewrite. The codebase's UI debt is primarily fragmented adoption and token duplication. A targeted standardization pass—starting with tokens, panel/button/input/modal variants, and state components—would materially reduce visual drift and maintenance cost while preserving the application's existing functionality and the intentional identity of each product area.
