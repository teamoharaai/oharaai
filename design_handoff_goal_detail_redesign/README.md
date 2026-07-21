# Handoff: Goal Detail Screen Redesign

## Overview
This is a redesign of the **Goal Detail screen** in the Ohara app (`app/(app)/goals/[id]/index.tsx`). It reworks the hero/title card, replaces the large countdown with a minimal strip, renames "Measurables" to "Trackers", and adds three new sections — **Analytics**, **Ohara Intelligence**, and **Recommended for you** — plus two new goal-level actions (mark-complete and an overflow menu that includes Move to project / Edit / Archive).

The reference design is a single self-contained HTML prototype (`Goal Detail.dc.html`) laid out at desktop width (~940px content column + 262px activity rail).

## About the Design Files
The files in this bundle are **design references authored in HTML/JS** — a prototype showing intended look and behavior. They are **not production code to copy**. This app is **Expo / React Native + NativeWind (Tailwind) + Supabase + Zustand**. The task is to **recreate this design inside the existing codebase**, reusing its established components, hooks, services, and design tokens (all of which already exist — see mappings below). Almost every enabler for this redesign is already present; this is largely a re-composition, not new infrastructure.

Open `Goal Detail.dc.html` in a browser to view the reference. It is a web mock — ignore its DOM/React structure and the `.dc.html` runtime; reproduce the **visual result and behavior** in React Native.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, and interactions. Every color in the mock already exists as a token in `constants/colors.ts` (`LIGHT_THEME`). Recreate pixel-for-pixel using the existing UI primitives (`Badge`, `ProgressRing`, `Typography`, `GoalTitleRow`, `Modal`) and tokens — do not hardcode new hex values where a token exists.

---

## What changes, mapped to the codebase

| Design section | Existing file to edit / reuse | Nature of change |
|---|---|---|
| Title/hero card | `features/goals/components/GoalDetailHeader.tsx` | Restructure: add overflow menu + mark-complete button; move deadline into a meta row; add End date; ring stays beside title |
| Minimal countdown strip | `features/goals/components/CountdownTimer.tsx` | Rewrite presentation to a compact single-row strip + progress bar (logic already computes days/hrs/min) |
| Trackers (was Measurables) | `features/goals/components/MeasurablesPanel.tsx` | Rename section label to "Trackers"; keep add/edit/complete behavior |
| Overflow menu (Move/Edit/Archive) | Reuse `GoalProjectPickerModal.tsx` + `useGoalDetail.onUpdateProject` | New menu triggers existing project-picker + status updates |
| Mark complete | `useGoalDetail` + `updateGoal(goalId, { status:'complete', progress:100 })` | New button; wiring already exists |
| Analytics | **New** component `features/goals/components/AnalyticsPanel.tsx` | Placeholder / Strava-sourced (see note) |
| Ohara Intelligence | **New** component `features/goals/components/IntelligencePanel.tsx` | Placeholder for now |
| Recommended for you | Extend `components/AffiliateTeaser.tsx` → `RecommendedPanel.tsx` | Filter chips + product cards (placeholder data) |
| Activity rail | `features/goals/components/ActivityFeed.tsx` | Unchanged — already the right-rail on desktop |

---

## Screens / Views

There is one screen: **Goal Detail**. On desktop (`width >= 1024`) it is a two-column layout — main workspace (`flex: 2`) + context rail (`flex: 1`, holds `ActivityFeed`). On mobile it collapses to a single scrolling column. This matches the current `index.tsx` structure; keep it.

Section order in the main workspace (top → bottom):
1. **Title / hero card**
2. **Countdown strip**
3. **Milestones** (existing milestone/timeline treatment — unchanged conceptually)
4. **Trackers** (renamed Measurables)
5. **Ohara Intelligence**
6. **Analytics**
7. **Recommended for you**

### 1. Title / hero card
- Container: `backgroundColor` `background.card` (#FFFFFF), `borderRadius: 20`, `borderWidth: 1` `border.warm` (#EDE6D8), padding `26px 28px`, soft shadow (`rgba(30,50,38,0.05)`, y+4, blur 22). **Note:** the current code uses a 4px `borderLeft` accent — the redesign drops that in favor of a full hairline border. Follow the redesign (avoid the left-border-accent pattern).
- **Top row:** left = badges (`Badge` components: category "Body", status "Active" with a 5px `accent.tealMid` dot, "✦ AI-guided"); right = a horizontal group with the **Mark complete** button + the **overflow (⋯) menu** trigger.
- **Mark complete button:** pill, `height 30`, padding `0 13px`, radius 9.
  - Default: bg #FFFFFF, text `accent.primary` (#4A7C5F), border #CFE0D4, label "✓ Mark complete".
  - Completed: bg `accent.primary`, text `accent.tealSubtle`-ish (#EDF6F0), label "✓ Completed".
- **Overflow (⋯) menu:** 30×30 tap target, glyph `text.muted`. Opens a 240px dropdown (bg card, border `border.warm`, radius 14, shadow). Items, in this exact order:
  1. `↦ Move to project…` → opens `GoalProjectPickerModal` (already built).
  2. `✎ Edit goal` → existing edit flow.
  3. divider.
  4. `⌫ Archive goal` → `feedback.danger.text` color. **See open question on archive status.**
- **Body row:** left column = goal mark icon (26×26) + title (`Lora`, 600, 32/1.1, `letterSpacing -0.4`, `text.primary`) + a subtle "✎" affordance, then description (`Inter`, 14.5/1.55, `text.secondary`, max ~56ch). Right = **ProgressRing** (size ~92, stroke 7, `accent.primary`) with % in center and an "On track" / "Completed" label (`accent.tealMid`, 11px/600) beneath.
  - When completed: ring → 100%, label → "Completed".
- **Divider:** 1px `border.warmSubtle` (#EFE9DC), margin `20 / 16`.
- **Meta row:** horizontal, `gap 34`, wrap. Each item = uppercase micro-label (10px/600, `letterSpacing 1`, `text` #B0A794) over a value (13.5px/600, `text.primary`). Fields: **Category** (`Body · Fitness`), **Started** (`Jun 28, 2026`), **End date** (derived from `goal.deadline`, formatted `Mon D, YYYY`). *(The Race day and Streak meta items were removed in this redesign — do not add them.)*

### 2. Countdown strip (minimal)
Replaces the old large flip-clock. Compact single row:
- Container: bg `background.sidebar` (#1E3226), radius 16, padding `14px 20px`, `flexDirection row`, `alignItems center`, `gap 18`, soft shadow.
- Left: label "RACE DAY IN" (10.5px/600, `letterSpacing 1.5`, uppercase, `accent.tealSoft` #9FD9C4).
- Center: value group, baseline-aligned, tabular numbers: `{dd}d {hh}h {mm}m` — numbers 22px/700 `text.inverse` (#EDE7DA); the unit letters 11px `#6E8C7B`.
- Flex spacer holding a thin progress bar: track `rgba(255,255,255,0.08)`, 4px tall, radius 3; fill = linear-gradient `#2F8F6D → #6FDFB8` at `timePct%`; below it a caption "Day N of M" (10.5px `#7C9A88`).
- Right: 28×28 `⋯` button (`rgba(255,255,255,0.06)` bg, radius 8, glyph `accent.tealSoft`) → opens the deadline calendar/date editor. The existing `GoalDetailHeader` already has an inline deadline editor + `onUpdateDeadline`; wire this button to that.
- `CountdownTimer.tsx` already computes `{days, hours, minutes}` and ticks every 60s — reuse it; only the render changes. For `timePct` / "Day N of M", use `getGoalRingProgress` / the goal `deadline` + `createdAt` span (see `utils/ringProgress.ts`).

### 4. Trackers (renamed Measurables)
- Same `MeasurablesPanel` behavior (add / edit / complete, weekly cadence rows, progress bars, streak dots). **Only the section label changes** from "Measurables" to **"Trackers"**, subtitle "What you measure each week". Card chrome: bg card, radius 20, border `border.warm`. "＋ Add a tracker" affordance: dashed border `#E4DECF`, radius 10, `text.muted`.

### 5. Ohara Intelligence  — PLACEHOLDER
- Dark card: gradient `#1E3226 → #24402F`, radius 20, padding `24px 26px`.
- Header: 26×26 rounded chip (`rgba(111,223,184,0.16)` bg) with "✦" `accent.teal`; label "OHARA INTELLIGENCE" (11px/600, `letterSpacing 2`, `accent.tealSoft`); right pill "● Strava connected" (dot `#FC5200`).
- Body: `Lora` italic 18/1.55 `text.inverse` — contextual advice string.
- Footer: two stat chips (`rgba(255,255,255,0.07)`, radius 10) + a CTA button "See what helps →" (bg `accent.teal`, text #12271D) that scrolls to Recommended.
- **This section is a placeholder.** Copy/data are illustrative; real content comes in development. Build the shell; stub the data.

### 6. Analytics — PLACEHOLDER (repo integration later)
- Card: bg card, radius 20, border `border.warm`, padding `24px 26px`.
- Header: "ANALYTICS" micro-label + `Lora` 19px title "Your training trend"; right = attribution "▪ via Strava · updated 2h ago" (14×14 `#FC5200` chip with "S").
- Stat grid: 4 columns (`background` #FCFAF4, border `border.warm`, radius 12) — Avg pace /km, Longest run, Total runs, Pace improved (last one `accent.tealMid`).
- Two charts side by side: a distance bar chart (weekly bars, ramp of greens ending on `accent.tealMid`) and a pace-trend line chart (SVG polyline `accent.primary`, last point `accent.tealMid`). Use the codebase's existing charting approach if any; otherwise `react-native-svg`.
- **This section is a placeholder for the real Strava/repo integration** — build the shell and wire to live data in development.

### 7. Recommended for you — PLACEHOLDER
- Card: bg #FCFAF4, border `border.warm`, radius 20, padding `24px 26px`.
- Header: "RECOMMENDED FOR YOU" micro-label + `Lora` 19px "Editor's picks…"; right pill "Curated · may earn Ohara a commission" (`rgba(30,50,38,0.08)`).
- **Filter chips:** All / Gear / Apps & plans / Recovery. Selected chip = bg `background.sidebar`, text `text.inverse`; unselected = bg card, text `text.secondary`, border #E4DECF. Radius 999, 7px/15px padding.
- **Product cards** in a responsive grid (`minmax(200px,1fr)`): image slot (128px, radius 12), category kicker (colored by type), `Lora` 16.5px product name, description (`text.secondary` 12.5/1.45), price + "View →" button (bg `background.sidebar`, text `text.inverse`). Filtering shows/hides cards by category.
- This extends the existing `AffiliateTeaser.tsx` ("Coming soon"). **Product content is placeholder** affiliate data.

---

## Interactions & Behavior
- **Mark complete (toggle):** optimistic `updateGoal(goalId, { status: 'complete', progress: 100 })`; toggling back → previous status. Ring animates to 100%, label → "Completed". Use the existing optimistic pattern in `useGoalDetail` (mirror `onUpdateDeadline`).
- **Overflow menu:** tap ⋯ toggles a dropdown; tapping any item or outside closes it (`Pressable` overlay). Move to project → `GoalProjectPickerModal` (already wired via `openProjectPicker` in `index.tsx`). Edit → existing edit route/flow. Archive → status change (see open question).
- **Countdown ⋯:** opens the deadline editor (existing inline `TextInput` YYYY-MM-DD editor in `GoalDetailHeader`, `onUpdateDeadline`). The web mock uses a calendar popover; a date picker or the existing text editor is acceptable — match the existing pattern.
- **Recommended chips:** local state `filter: 'all' | 'gear' | 'apps' | 'recovery'`; filters visible cards.
- **Intelligence CTA:** scrolls to / focuses the Recommended section.
- Ticking: countdown updates every 60s (already implemented).

## State Management
Reuse `useGoalDetail(goalId)` — it already exposes `goal`, `onUpdateDeadline`, `onUpdateProject`, `onSaveMeasurable`, `onCompleteMeasurable`, `completedIds`, errors. Add:
- A `completed` view state derived from `goal.status === 'complete'` (no new store needed; drive off `goal.status`).
- A `onUpdateStatus(status)` helper in `useGoalDetail` (optimistic, mirrors `onUpdateDeadline`, calls `updateGoal(goalId, { status, progress })`). Use for mark-complete and archive.
- Local UI state (not in store): `menuOpen`, Recommended `filter`, calendar/editor visibility.
Projects for the picker come from `useProjectStore` (already loaded via `loadProjects()` in `index.tsx`).

## Design Tokens
All present in `constants/colors.ts` → `LIGHT_THEME` (dark variants in `DARK_THEME`). Read via `useThemeColors()`; **do not hardcode**. Key ones used here:
- Page bg `background.page` #F8F4EC · Card `background.card` #FFFFFF · Dark surface `background.sidebar` #1E3226 · Warm surface #FCFAF4 (`background.goalCard` is #FCFAF4).
- Text: primary #211F1A, secondary #8A8172, muted #A79E8E, inverse #EDE7DA.
- Border: warm #EDE6D8, warmSubtle #EFE9DC, divider #E8E5DF.
- Accent: primary #4A7C5F, teal #6FDFB8, tealMid #2F8F6D, tealSoft #9FD9C4, tealSubtle #E8F5EF.
- Danger (archive/destructive): `feedback.danger.text` #C0483A.
- Strava brand orange: **#FC5200** (not a token — external brand color; keep as literal).
- **Type:** headings/serif accents = **Lora** (`Lora-Regular` / `Lora-SemiBold` / `Lora-Italic`); everything else = **Inter** (`Inter-Regular/Medium/SemiBold/Bold`). Fonts already loaded in `assets/fonts`.
- **Radii:** cards 20, inner cards/chips 12–16, buttons 9–10, pills 999.
- **Shadow (cards):** color #000, y+4, blur 22, opacity 0.05.

## Assets
- Brand marks in `assets/brand/` (already in the app): `goal-mark.png`, `goals-logo.png`, `echo-logo.png`, `ohara-logo.png`, `today-logo.png`.
- Product images in Recommended are **placeholders** (drop-in image slots in the mock) — replace with real affiliate imagery in development.
- Icons in the mock are Unicode glyphs (✓ ⋯ ✦ ↦ ✎ ⌫ ◫ ›). Use the app's existing icon convention if one exists; otherwise glyphs are acceptable as in current components.

## Open Questions / Notes for the implementer
1. **Archive status:** `GOAL_DB_STATUSES = ['active','complete','stagnant','discovered']` — there is **no `archived` status**. Decide with product whether "Archive goal" maps to `discovered` (renders the "archived" badge variant today), a soft-delete, or a new status. Do not silently pick one.
2. **Strava:** Analytics + the "Strava connected" indicator imply a Strava integration that does not exist yet. Build the UI against a stubbed data shape and gate on a connection flag.
3. Milestones section is shown in the mock for context but is essentially the current treatment — no redesign intended there.
4. Keep the existing desktop/mobile split and the `ActivityFeed` context rail exactly as in `index.tsx`.

## Files in this bundle
- `Goal Detail.dc.html` — the hi-fi reference prototype (open in a browser).
- `support.js`, `image-slot.js` — runtime files required for the prototype to render locally. Not for production.
- `assets/brand/*` — brand marks used by the prototype (already in the app).
