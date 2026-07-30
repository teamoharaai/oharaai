# components/CLAUDE.md — Component Rules

Owner: VP Product. Cascade Level 1 (visual), Level 2 (data fetching).

## Theme (enforced everywhere)
Post-redesign warm ramp (Sessions 1–4c). Canonical tokens: `constants/colors.ts` → `LIGHT_THEME`.
- Page background: warm cream #F8F4EC (`background.page`, was #F5F1EA)
- Cards: white #FFFFFF (`background.card`), rounded 16px, warm border #EDE6D8 (`border.warm`), soft shadow
- Sidebar: deep emerald #1E3226 (`background.sidebar`, was #3D5247)
- Accent: earth green #4A7C5F (`accent.primary` / `text.accent` / `border.accent`, was #3D5247); teals `accent.tealMid` #2F8F6D, `accent.tealSoft` #9FD9C4
- Text: #211F1A primary, #8A8172 secondary, #A79E8E muted (`text.*`; retired #1A1F1C / #6B7B6E / #9CAF9F)
- Feedback: `feedback.danger` is `{ text, bg, border }` (not a flat hex) — danger/overdue text is `feedback.danger.text` #C0483A; `.bg`/`.border` are soft-tint values for error banners. Sibling groups: `feedback.pending.*` (unconfirmed AI-suggestion banners) and `feedback.info.*` (neutral info banners, e.g. Echo composer notices)
- Typography: Inter for all UI, including headings, greetings, goal titles, and editorial-style moments
- BRT colors: Bud #4A7C5F, Rose #F59E0B, Thorn #EF4444

## Typography variants (components/ui/Typography.tsx)
Use the `Typography` component with a `variant` — do not hardcode font/size/color. Beyond the base set (`heading`, `title`, `body`, `label`, `caption`, `ai`/`ai-italic`, `eyebrow`, `greeting`, …), redesign added exact-spec variants: `card-title` (15.5px, ProjectCard title), `card-description` (12px/18, ProjectCard description), `goal-title` (14.5px/19, GoalRingCard title).

## Key Components
- DatePicker.tsx: app-wide controlled calendar input for `YYYY-MM-DD` values. It presents a
  token-driven, mobile-friendly calendar with temporary selection, Cancel/Apply, month
  navigation, min/max bounds, optional clearing, and the canonical local-calendar parse/format
  helpers. All date inputs should import `DatePicker` directly; do not add native date inputs
  or raw date-text fields. Keep persisted/API values as local-calendar `YYYY-MM-DD` strings and
  format human-readable labels only in the UI.
- GoalCard.tsx: shows title, status, progress, vault activity line, BRT micro-dots
- ProjectCard.tsx: teal status dot, project title + description, chevron toggle (collapsed by default); expands to a single-column list of compact ProjectGoalRows.
- ProjectGoalRow.tsx: compact 56px linear goal entry used by dashboard ProjectCard expansions, project-detail Goals, and the dashboard Goals list-view option; includes only the category-tinted goal icon, title, deadline/commitment line, and navigation arrow, intentionally omitting category/status pills and the full GoalCard left accent stripe.
- VaultItemCard.tsx: renders vault items by type (note/link/insight/action_update/document)
- EchoTrail.tsx: filtered echo entries for a goal, read-only, tap navigates to Echo
- Constellation graph shapes: category hubs use the canonical category symbol,
  goals are planet circles, and non-empty goal BRT summaries are smaller moons.
  Interactive web SVG groups must keep their `data-constellation-node`
  selection key so viewport dragging and click suppression remain centralized.
  Private user goal links use dashed teal `user_goal_link` edges and preserve
  `data-constellation-goal-link` on the web hit target so selecting the edge can
  open its required note. Constellation authoring belongs in the header Add
  popover; Reset layout and viewport controls sit beside it, not over the
  canvas.
- Typography.tsx: shared typography component (components/ui/Typography.tsx)

## Rules
- NativeWind for all styling. No inline style objects unless NativeWind cannot express it.
- fontFamily: 'Inter' must be set explicitly on any Text not using Typography component.
- No heavy third-party UI libraries. Lightweight custom components preferred.
- Bottom sheets: simple Modal or custom component. No react-native-bottom-sheet.
- All components must work on both web and mobile (Platform-aware when needed).
- Optimistic UI for mutations. Update state immediately, revert on error.
