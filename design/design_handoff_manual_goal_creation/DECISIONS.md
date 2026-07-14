# Handoff: Manual Goal Creation (AI as Suggestion Layer)

## Overview
Redesign of Ohara's goal-creation screen from an **AI-conversational flow** to **manual creation as the primitive**. The user fills a structured form themselves; AI appears only as an optional suggestion that pre-fills a field the user confirms. This replaces the current chat-based `app/goals/create.tsx`.

Core rule to hold everywhere: **AI never writes.** It suggests; the user confirms. Nothing persists until the user taps **Create goal**.

## About the Design Files
The files in this bundle are **design references created in HTML** (a Design Component prototype) — they show the intended look, layout, and behavior. They are **not** production code to copy directly. The task is to **recreate this design in the existing Ohara codebase** (Expo / React Native Web + NativeWind) using its established patterns, tokens, and components.

The prototype was built directly from the repo's own tokens and chrome, so translation is close to 1:1.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, chrome, and interactions. Recreate pixel-accurately using the codebase's existing primitives (`Typography`, `LIGHT_THEME`, `Sidebar`, NativeWind). All hex values, font weights, and sizes below are exact.

---

## Recommended plan of work (audit first)
Per the repo's discipline (`AGENTS.md` / `Context.md`): audit before implementing, one declared concern per prompt, update `CHANGELOGCODEX.md`.

1. **Audit** — diff this doc against live `goals`, `echo_entries`, `echo_entry_links` schema and the existing `app/goals/create.tsx` + `app/api/goals/*` routes. Confirm no collision with the Echo Folders `container_type` pattern or legacy `goal_id` dual-write debt.
2. **Migration 019** (additive, pre-pilot, no backfill) — add `goals.target_frequency jsonb NULL`.
3. **Screen rewrite** — replace `app/goals/create.tsx` with the manual form (this doc).
4. **AI suggestion route** — a suggestion-only Haiku call returning one measurable; wired to the add-form, never to a write path.

---

## Screens / Views

### Screen: New Goal (`app/goals/create.tsx`)
**Purpose:** Create a SMART goal by hand — name it, set a required deadline, choose a rhythm, and add the milestones that make it measurable.

**Layout**
- Root: horizontal flex, full viewport height. Left `Sidebar` (existing component, 220px expanded, `#1E3226`). Right: main column (`flex:1`).
- Main column: fixed top nav bar (`borderBottom 0.5px #EAE7E0`) + vertical scroll body.
- Scroll body: single centered column, `max-width: 660px`, `padding: 36px 24px 80px`.
- Cards stack vertically, `margin-bottom: 16px` (last `20px`).

**Card style (shared)**
- `background:#FFFFFF; border:1px solid #EDE6D8; border-radius:16px; box-shadow:0 2px 12px rgba(0,0,0,0.04); padding:20–24px.`
- Section eyebrow: `font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:#8A8172`.

**Cards, in order**

1. **Name the goal**
   - Eyebrow "NAME THE GOAL".
   - Title input: borderless, `font-size:26px; font-weight:600; color:#211F1A; letter-spacing:-0.3px`. Placeholder `"e.g. Lose 2 lbs by August 31"`. **Required.**
   - Divider `1px #EFE9DC`.
   - Eyebrow "WHY IT MATTERS".
   - Narrative textarea: `font-family: Lora; font-style:italic; font-size:16px; line-height:1.55; color:#4A7C5F`. Placeholder `"Why is this worth it to you? What changes when you get there?"`. Optional.

2. **Set a deadline** (moved above rhythm — deadline drives time-decay progress)
   - Eyebrow "SET A DEADLINE".
   - Row (flex, gap 28px, wraps): left = **Target date `*`** (required) native date input, `170px`, `border-radius:999px; border:1px solid #D8D2C8` (turns `#C0483A` on error). Right = **Link to a project (optional)** chips.
   - Project chip: `padding:8px 14px; border-radius:999px`. Unselected `#FFFFFF / 1px #EAE7E0`, text `#8A8172`. Selected `#1E3226` bg, text `#EDE7DA`. Leading 7px color dot.
   - Time-decay note card (`#FCFAF4 / 1px #EFE9DC`, radius 12): "Progress is measured against this date. As the deadline approaches your goal naturally fills toward **100%** — so even partial effort still counts as progress."

3. **Your rhythm**
   - Eyebrow "YOUR RHYTHM" + right-aligned "Track a cadence" toggle.
   - Toggle: 46×26 track, radius 13, knob 20×20 white. On `#4A7C5F` + knob `translateX(20px)`; off `#D8D2C8`.
   - **On (trackable):** "How often will you show up?" + hint "Pick a pace you can realistically keep — consistency beats intensity." Then: period segmented control (`week`/`month`, pill in `#F0EDE6` track, active chip white with shadow); `−/+` stepper (44×44 hit targets, `#4A7C5F` glyphs) with count (`24px/600`); live summary (Lora 18px) "N× a week"; and for week, a 7-dot strip (30px circles, S M T W T F S), first N filled `#4A7C5F`/white, rest `#F0EDE6`/`#A79E8E`.
   - **Off (narrative):** muted note "A direction, not a streak — no checkmarks or streaks, just something meaningful to move toward."

4. **Milestones** (the measurables — this is the format the team wants to keep)
   - Eyebrow "MILESTONES".
   - Empty state copy: "What will you track to know it's working? A goal to lose weight might track weight 3–5× a week and log workouts. Add each measure yourself."
   - Milestone row: `#FCFAF4 / 1px #EFE9DC`, radius 12, padding 12/14. Type chip (tinted) + title (`14px #211F1A`) + `×` delete.
   - Type chips/colors: **Counter** `#2F8F6D`, **Habit** `#4A7C5F`, **Checklist** `#B45309` (bg = same at 12% alpha). These map to `GOAL_MEASURABLE_TYPES` (`counter|habit|checklist`).
   - Action row: **＋ Add milestone** (dashed `#D8D2C8`) opens inline add-form (name input + 3 type pills + Cancel/Add). **✦ Suggest one with Ohara** (`#F1F6F2 / 1px #D6E4DB`, text `#4A7C5F`) — visible only when AI layer enabled.

5. **Footer + Create**
   - Note: "✦ Ohara only ever suggests. Nothing is written until you create the goal yourself."
   - Full-width **Create goal** button `#4A7C5F`, radius 14, white 15px/600. Also mirrored as a pill in the top nav.

### Overlay: Goal Created (success state)
- Full-screen scrim `rgba(30,50,38,0.55)`. Centered white card, radius 20, padding 40/48, `box-shadow:0 20px 60px rgba(0,0,0,0.25)`, `pop` entrance animation.
- 64px mint circle (`#EAF3ED`) with `✓` `#4A7C5F` 32px.
- Goal title (Lora 22px/600 `#211F1A`), subtext "Your goal is created — exactly as you shaped it." (`14px #8A8172`), and a "Create another" outline pill.

---

## Interactions & Behavior
- **AI suggest:** tap "Suggest one with Ohara" → one `{title, type}` measurable renders in an amber pending draft (`#FFFBEB / 1px #FDE68A`, text `#B45309`, `fadeSlide` 0.28s). Draft title is editable. Actions: **＋ Add this milestone** (commits to the list), **↻ Regenerate**, **Dismiss**. Committing clears the draft. Prototype uses a keyword→suggestion heuristic; production should call Haiku with the goal title + why.
- **Add milestone (manual):** open form → name + pick type → Add appends to list.
- **Rhythm:** stepper clamps 1–7 (week) / 1–30 (month); switching period re-clamps. Dots reflect count for week.
- **Validation:** Create is disabled (`opacity 0.45`) until **title non-empty AND deadline valid (parseable, not in the past)**. Invalid/empty deadline on Create shows inline error and blocks.
- **Create:** on success, show the overlay; "Create another" resets the form.

## State Management
`titleText`, `whyText`, `deadline` (+ `deadlineError`), `trackable` (bool, default from `startTrackable`), `period` (`week|month`), `count`, `milestones: [{id,title,type}]`, `selectedProjectId`, add-form (`showAddForm`, `draftTitle`, `draftType`), `suggestion: {title,type}|null`, `created` (bool).
Data: `useProjectStore` for project chips; on Create, assemble the `POST /api/goals` payload client-side (no AI), then `fetchGoalById` + `upsertGoal`.

## Tweakable flags (from the prototype)
- `aiAssistEnabled` (bool) — hide the AI suggestion button entirely.
- `startTrackable` (bool) — default state of the rhythm toggle.

## Design Tokens (all from `constants/colors.ts` LIGHT_THEME unless noted)
- Page `#F8F4EC` · Card `#FFFFFF` · Sidebar `#1E3226` (active nav `#2A4436`, inactive text `#8FA294`) · Input `#F0EDE6` · goalCard surface `#FCFAF4`.
- Text: primary `#211F1A` · secondary `#8A8172` · muted `#A79E8E` · inverse `#EDE7DA` · accent `#4A7C5F`.
- Border: warm `#EDE6D8` · warmSubtle `#EFE9DC` · subtle `#EAE7E0` · input `#D8D2C8`.
- Accent: primary `#4A7C5F` · tealMid `#2F8F6D`. Danger `#C0483A`. Pending: bg `#FFFBEB`, border `#FDE68A`, text `#B45309`.
- Radius: cards 16, inner tiles 12, pills 999, control tiles 8–10. Shadow (card) `0 2px 12px rgba(0,0,0,0.04)`.
- Type: **Inter** 400/500/600/700 (UI) · **Lora** 400/500 + italic (narrative/summary/success title). Sizes per component above.

## Schema (Migration 019 — additive, no backfill)
- `goals.target_frequency jsonb NULL` — `{ "times": 3, "period": "week" }`. `NULL` = narrative goal (toggle off, no streak logic); set = trackable. Reuse existing measurables for milestones — no new table for this screen. (The broader spec's `artifacts` table is out of scope here.)

## Assets
Brand PNGs copied from `assets/brand/` in the repo: `ohara-logo.png`, `goals-logo.png`, `echo-logo.png`, `goal-mark.png`. Bundled under `assets/` here. Use the repo's `BrandIcon` component in production.

## Files
- `New Goal.dc.html` — the high-fidelity design prototype (open in a browser). Markup + logic + tweak props.
- `assets/` — brand icons used by the design.
- `screenshots/` — reference renders (creation UI + success state).

## Session Addendum — Manual Goal Creation Implementation (2026-07-13)

1. `target_frequency`: jsonb `{ times: int, period: 'day'|'week'|'month' }`, nullable.
2. `artifacts.echo_entry_id`: NOT NULL (unchanged from original doc; artifacts table itself out of scope for this migration).
3. This file (formerly README.md) is the single canonical decision record for this handoff — no separate summary file.
4. `artifacts.embedding`: bare `vector` type, dimension enforced app-side via existing `lib/ai/constants.ts` pattern, matching `echo_entries.embedding` (deferred until artifacts table is built).
5a. `createGoalWithMeasurables` generalized to accept manual-shaped input (not AI-typed union) — single write path, no duplicate insert function. `/api/goals` validator fully swapped from `validateGoalFinalizeResponse` to a manual-shaped validator (no dual-path — `/api/goals/create` removal means no caller will ever send AI-shaped payload again).
5b. `/api/goals/create` removed entirely. Its sole caller, `app/goals/create.tsx`, rewritten against the new manual form. No response-shape backport needed (chat-specific fields `requestId`/`message`/`isComplete`/`finalizedBy` have no manual-flow equivalent).
6. `vaults` insert in the generalized function becomes conditional on an optional vault-context param, absent on the manual path (no vault-context exists in the manual UI). Code path preserved, not deleted, for future Vaults chatbot work.
7. Transaction/error-handling shape (blocking `goals` insert, non-blocking `measurables`, fire-and-forget embedding update) inherited as-is — not in scope to change this session.
8. `goals.category` stays NOT NULL, 6-value CHECK, unchanged. Manual creation UI adds a category selector (see Design Addendum) rather than relaxing the constraint — reuses existing `CATEGORY_COLOR_THEME` mapping, no default value assumed.
9. AI suggestion button ("Suggest one with Ohara") ships visible but disabled (`opacity: 0.45`, non-interactive) — `aiAssistEnabled: false`. Real Haiku-backed suggestion route logged to `OUTSTANDING.md` as a separate future session.
10. `CATEGORY_THEME` relocated from private `lib/db/goals.ts` to `constants/themes.ts`, exported as `CATEGORY_COLOR_THEME`, colocated with `GOAL_THEMES`. Collapses the two-file/two-owner duplication flagged in the conventions audit. `CATEGORY_THEME_MAP` (broken, wrong vocabulary) left untouched, logged in `OUTSTANDING.md`.
11. `description` and `deadline` columns already exist on `goals` (text/timestamptz, both nullable) — no migration needed; Card 1's "why it matters" maps to `description`, Card 2's deadline maps to `deadline` directly.
12. Milestones captured at creation time (Card 4, part of the same `POST /api/goals` payload) and post-creation via existing independent `createMeasurable()` flow — both supported, no conflict.
13. Create-button validation: `title non-empty AND deadline valid AND category selected`.