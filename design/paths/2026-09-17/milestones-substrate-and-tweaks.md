# Milestones → Meaning/Social Primitive — Session Summary & Tweak Design
**Date:** 2026-09-17
**Initiative:** Paths (milestones as the pivot steps / journey toward a goal)
**Status:** Build 1 shipped + migration applied. **§4 tweaks IMPLEMENTED 2026-09-17** (both §6 open items resolved — see below); `npx tsc --noEmit` clean, goals (20) + tasks/momentum (112) suites green. All in `MilestonesPanel.tsx`, no schema change.

---

## 1. Vision (Justin's framing)

Milestones are the **true accomplishments and pivot steps** toward a goal. They are becoming
**Ohara's meaning primitive and the foundation of the social layer** ("meaningfulness is the
environment of Ohara"). They will eventually be shared. Two variants surfaced naturally:

- **Prep** — enabling prerequisite step (buy running shoes, sign up for the 5k). Low weight, a checklist item.
- **Achievement** — proof of transformation (the sauna reflection, ran the race, cooked a recipe).
  Carries a hero photo + reflection + story-card styling. This is the social-worthy unit.

Countable case: "explore gastronomies → cook 3 new recipes." Modeled as an **achievement with a
target count + sub-milestones**, each recipe an independently postable child.

---

## 2. What shipped this session (Build 1 — DONE)

Code complete, `npx tsc --noEmit` clean, goals/tasks/momentum suites green (152 tests).
**Migration 052 applied to the live DB (project rrgiqemscnyaqkculnmb) and recorded in the tracker.**

- **`supabase/migrations/052_milestones_kind_hierarchy_photo.sql`** — added to `milestones`:
  - `kind` `'prep' | 'achievement'` (default `'achievement'`; existing rows backfilled to achievement)
  - `parent_id` self-referential FK (sub-milestones; schema allows arbitrary depth, UI = one level)
  - `target_count` int
  - `photo_url` text
  - Private `milestone-photos` storage bucket (10 MB cap) + 4 owner-scoped RLS policies.
- **Types:** `types/supabase.ts` (milestones Row/Insert/Update + self-FK relationship),
  `features/goals/types.ts` (`MilestoneKind`, extended `GoalMilestone` / `GoalMilestoneInput` /
  `GoalMilestoneUpdates`).
- **Service/DB:** `features/goals/services/goal-service.ts` (`DbMilestone`, `mapMilestone`,
  `GOAL_SELECT`, `createMilestone`, `updateMilestone` carry the new fields).
- **Photo service:** `features/goals/services/milestone-image-service.ts`
  (`uploadMilestonePhoto`, `createSignedMilestonePhotoUrl`, `removeMilestonePhoto`) — mirrors
  `features/entries/services/note-image-service.ts`.
- **Hook:** `features/goals/hooks/useGoalDetail.ts` — `onAttachMilestonePhoto` (expo-image-picker →
  upload → `updateMilestone(photoUrl)`) and `resolveMilestonePhotoUrl` exposed as props; existing
  add/save handlers carry the new fields through via the extended types.
- **UI:** `features/goals/components/MilestonesPanel.tsx` — prep rows vs achievement story cards,
  hero photo, sub-milestone grouping, "N of M" progress, kind toggle + target-count in the editor,
  add-sub-milestone, add/replace-photo. Props wired at both render sites in `GoalsWorkspace.tsx`.

### Known limitations carried forward
- `start_goal_new_phase_v1` RPC (migration 047) drops `kind`/`parent_id`/`target_count`/`photo_url`
  when cloning pending milestones into a new phase → they flatten to top-level achievements.
  Fix alongside Build 2.
- Reflection *content* surfacing on the card is not yet built (linking exists via
  `reflection_milestone_links`, migration 036; reading it crosses the goals↔entries boundary —
  only `lib/db/entries.ts` reads it today).

---

## 3. Feedback from first look (drives the tweaks)

1. **No strike-through, anywhere.** A completed sub-milestone that captures "this is how I did it"
   is a positive record, not a crossed-off todo; prep items ("Buy running shoes") shouldn't be
   struck out either. The **filled green checkmark alone** is the completion signal for all types.
2. **"+ Add milestone" is ambiguous** — the Prep/Achievement toggle makes both options look the
   same; you can't tell they'll behave differently (will it strike out?) until after completion.
   Needs a **unique identity per path** and to close the loop *before* completion.
3. **Counter logic is misleading.** One sub-milestone renders "1/1", which falsely reads as done.
   Desired: when creating an achievement, optionally **set a target counter**; keep adding
   sub-milestones and allow **exceeding** it (e.g. 5/3); "accomplished" is derived from reaching the
   target — no needless auto-green-checkmarks.
4. **Justin's disambiguation idea:** keep a lightweight **prep checklist template always present**
   ("Let's prepare"-style, but smoother / on-theme) as an always-available empty template — click to
   fill, else stays empty — so **"+ Add milestone" has one clear purpose** (achievements).
5. **Trailed-off note:** "Also if I make a nested…" — OPEN, needs clarification (see §6).

---

## 4. Proposed redesign (to implement next session)

### 4a. Two physically separate zones (removes the toggle → kills the ambiguity)
Replace the single "+ Add milestone" + Prep/Achievement toggle with two visually distinct areas.
The *unique identifier* Justin asked for is structural: you can tell which is which by where and how
it renders, before completing anything.

- **Zone 1 — Groundwork (prep checklist), always present.**
  - Compact checklist, muted/secondary treatment, on-theme (OHARA green accents).
  - A **persistent ghost input row** always shown ("＋ Add a prep step…"); typing creates a
    `kind='prep'` milestone, empty stays unpersisted. This is the "empty template that's always
    available" Justin described.
  - Rows: checkbox + text only. No photo, no required date. **No strike-through** — completed = filled
    check, text stays legible (optional slight muting).
- **Zone 2 — Milestones (achievements), the story cards.**
  - Added via **"+ Add milestone"** which now creates achievements only — one unambiguous purpose.
  - Photo + title + description + progress + sub-milestones.

**DECIDED:** Zone 1 = **"Prep"**; Zone 2 keeps the canonical **"Milestones"** (achievements are the
true milestones — matches "milestones are the true accomplishment").

### 4b. Remove strike-through (all types)
Delete `textDecorationLine: 'line-through'` from prep rows and sub-milestones in
`MilestonesPanel.tsx`. Completion = filled green checkmark. Keep "Reached · <date>" on achievements
(meaningful evidence) but never strike the title.

### 4c. Counter / accomplishment logic (fixes the "1/1" problem)
Two achievement shapes:

- **Single achievement** (no `target_count`, e.g. sauna reflection): completed by its own checkmark.
  **No fraction shown.** Carries photo + reflection.
- **Counter achievement** (`target_count` set, e.g. "Cook 3 recipes", target 3):
  - Progress = `completedSubs / target_count` (denominator is the **target**, not children count —
    this is the fix; one sub of a target-3 shows "1 of 3", not "1/1").
  - May **exceed**: reaching the target does NOT stop you — you can keep adding/completing subs,
    so "4 of 3", "5 of 3" are valid and shown. Extra subs are bonus records; they never
    un-accomplish it.
  - **DECIDED — prompt to seal (not auto):** when `completedSubs >= target_count`, surface a
    "Mark accomplished" affordance; the user confirms the seal (sets `completedAt`). Nothing
    auto-checks. This is what avoids phantom green checkmarks.
  - **DECIDED — early seal allowed:** the user may mark it accomplished before the target too
    (e.g. at 2 of 3) — life changes; they decide it's enough.
  - `target_count` editable after creation (already supported in updates).

Rule preventing false greens: an achievement with sub-milestones is never auto-complete — it is
sealed only by an explicit tap (at, past, or before target). A childless single achievement
completes only by its own manual check.

### 4d. Sub-milestone semantics — DECIDED: evidence-style, two child modes
- **Under a counter achievement:** sub-milestones are **completable, counting** records (checkmark,
  no strike-out) — completing one advances the counter toward `target_count`. Each can carry its own
  photo + caption.
- **Under a single (non-counter) achievement:** sub-items are **checkmark-free "how I did it"
  evidence** entries — photo + caption only ("what shifted", "the moment"). Pure evidence, no
  completion state. This is the richer model Justin chose; it also dovetails with reflection
  surfacing (evidence under an achievement).

Implication: a child's rendering depends on whether its parent has a `target_count`. Needs a clean
way to author an evidence child (photo + caption, no checkbox) vs a counting sub (title + checkbox).

---

## 5. Implementation notes for next session (no code yet)
- All UI changes are concentrated in `features/goals/components/MilestonesPanel.tsx` (split into a
  Groundwork checklist section + Milestones/achievements section; remove `textDecorationLine`;
  ghost input row for prep; progress denominator = `target_count`; derived-accomplished state).
- Editor: drop the Prep/Achievement toggle; the achievement editor keeps title/description/date +
  optional target count; prep creation happens inline via the ghost row.
- Derived-accomplished may need a small handler decision (auto-set `completedAt` when target met vs
  a "Mark accomplished" affordance) — see §6 Q3.
- No schema change required for these tweaks (all fields already exist from migration 052).

---

## 6. Decisions & remaining open questions

**Decided (2026-09-17):**
- Prep zone name: **"Prep"** (§4a).
- Accomplishment: **prompt to seal** at target, **no auto-check**; can **exceed** the target (4/3,
  5/3…) (§4c).
- **Early seal allowed** below target (§4c).
- Sub-milestone model: **evidence-style** — counting subs under counter achievements, checkmark-free
  evidence children under single achievements (§4d).

**Resolved (2026-09-17, at implementation):**
1. **"Also if I make a nested…"** → the concern was **a sub auto-sealing its parent**. Already
   prevented by prompt-to-seal: a counter achievement shows no fillable top dot until the user taps
   "Mark accomplished" (`showTopDot = !isCounter || completed`). No scope change; stays one level deep.
2. **Authoring the two child modes** → **parent-derived, no mode picker.** The add-child button and
   its editor adapt to the parent's `target_count`: counter → "＋ Add step" (title + checkbox +
   optional photo); single → "＋ Add evidence" (`captionMode` editor: caption + optional note, no
   date, no checkbox; photo attached after via 📷). Keeps the "kill the toggle" spirit of §4a.

## 8. What was implemented (2026-09-17)
All in `features/goals/components/MilestonesPanel.tsx` (props unchanged; both `GoalsWorkspace` sites untouched):
- **No strike-through** on any row/card (all `textDecorationLine`/`KindToggle`/`allowKind` removed).
- **Two zones:** "Prep" (compact checklist + persistent ghost `＋ Add a prep step…` row → creates
  `kind='prep'`, empty stays unpersisted via `handleAddPrep`) and "Milestones" (achievement cards;
  `＋ Add milestone` creates achievements only, with optional target count).
- **Counter logic:** progress denominator = `target_count` (`N of M`, may exceed); no auto top dot;
  `renderSealButton` — prominent at/past target, subtle "Mark accomplished early" below; single
  achievements show no fraction and seal via their own top dot.
- **Children:** `renderCountingSub` (checkbox, no strike) under counter parents; `renderEvidenceChild`
  (photo + caption, no checkbox, no completion) under single parents — chosen by `isCounter`.

### 8a. Builder polish (2026-09-17, post-QA)
- The achievement builder's target + target date now live behind a Tasks-style **"More options"**
  reveal (`showMore`, auto-expanded on edit when either is already set); the default view is just
  title + description.
- Target is a compact **`TargetStepper`** (`− n ＋`, "Target" label): empty = `—` (single
  achievement, no counter); `＋` from empty starts at 1; stepping below 1 clears to none; cap 99.
  It sits **inline on one row** with the date to minimize whitespace, above a one-line hint.
- Target date is optional via the **`compact` `DatePicker`** mode: an **Ionicons `calendar-outline`**
  icon (replaced the old `▦` glyph that read as a grill) that shows its placeholder ("Target Date")
  on web hover and the chosen date once set — the existing calendar popup is unchanged. Prep/child
  editors keep the full date field.

---

## 7. Roadmap
- **Build 1 (done):** substrate — kind, photos, sub-milestones, target counts, story cards. Migration 052 live.
- **Tweaks (next session):** §4 above — zones, no strike-through, counter/accomplishment logic.
- **Build 2 (agreed):** link task completions (`task_occurrences`) as milestone evidence (Justin's
  weekly-task idea); touches the Tasks subsystem (CTO lane, L3). Also fix the phase-continuation RPC.
- **Reflection surfacing:** show linked reflection content on the achievement card (crosses
  goals↔entries boundary).
- **Phase 2 (per CLAUDE.md):** the actual social feed/profile surface — its own `features/` slice,
  reads this substrate; does not modify goals internals.
