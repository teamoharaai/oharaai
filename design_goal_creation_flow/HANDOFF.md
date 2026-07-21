# Goal Creation Flow — Implementation Handoff

**Prototype:** `Goal Creation Flow.dc.html`
**Target:** Ohara app — Expo / React Native + NativeWind + Supabase + Zustand
**Existing screen to replace:** `app/goals/create.tsx` (single-page → 4-step wizard)

The prototype is a design reference, not code to copy. Recreate the visual result in React Native using existing primitives. Almost every enabler already exists; this is a re-composition + one wizard shell.

---

## 4 Steps

| # | Screen | Prototype `data-screen-label` | Layout |
|---|---|---|---|
| 1 | Start (outcome + category) | `Step 01 — Start` | Header · outcome input + suggestion callout · category grid (3 cols) |
| 2 | Details | `Step 02 — Details` | Reason textarea · date preset pills · days-per-week pills · live preview card |
| 3 | Tracking | `Step 03 — Tracking` | Roadmap (milestone list) · Weekly pack (core + optional metrics) |
| 4 | Confirm | `Step 04 — Confirm` | Privacy toggle · summary card · success state |

Skip link on Step 2 jumps to Step 4 with `milestones: []`, `trackers: []`.

---

## Reuse from the existing codebase

**Do not build new; wire these:**

| Prototype element | Existing file |
|---|---|
| Wizard state / handlers | New hook `useGoalCreationWizard.ts` — thin wrapper around `useState` (see State shape below) |
| Category card / badge | `components/ui/Badge.tsx` for the chip; category grid is a plain `Pressable` grid |
| Card chrome | `components/ui/Card.tsx` (`elevated`, `padding="spacious"`) |
| Button | `components/ui/Button.tsx` (primary + secondary variants) |
| Textarea / input | `components/ui/Input.tsx` |
| Privacy toggle | `components/ui/Toggle.tsx` |
| Progress ring on success state | `components/ui/ProgressRing.tsx` |
| Undo toast (milestone remove) | If a Toast host exists in `components/layout/*`, use it — otherwise add a minimal `Toast` primitive |
| Deadline picker | Reuse `DateField` currently defined in `app/goals/create.tsx` (extract to `components/ui/DateField.tsx` if worth it) |
| Goal persistence | `lib/db/goals.ts` → `createGoalWithMilestonesAndTrackers(userId, input)` — **already accepts milestones + trackers.** No schema changes needed. |
| Post-create hydration | Existing `fetchGoalById` + `useGoalStore.upsertGoal` (see current `handleCreateGoal` in `app/goals/create.tsx`) |
| Optimistic status/deadline updates pattern | Mirror `useGoalDetail.onUpdateDeadline` |

**No new API. No new tables. No new mutations.** The prototype's data shape maps 1:1 to `ManualGoalCreationInput`.

---

## Design tokens

Every color in the prototype already exists in `constants/colors.ts` (`LIGHT_THEME`). Read via `useThemeColors()`; do not hardcode:

- Page bg: `background.page` (#F7F4EE / prototype uses category-tinted bg — see below)
- Card: `background.card` (#FFFFFF)
- Dark surface (sidebar): `background.sidebar` — note the prototype uses `#1E3226`; the app's sidebar token already covers this
- Text primary/secondary/muted: `text.primary`, `text.secondary`, `text.muted`
- Warm borders: `border.warm` (#EDE6D8), `border.warmSubtle` (#EFE9DC)
- Accent (default green): `accent.primary` (#4A7C5F), `accent.tealMid` (#2F8F6D)

Type: **Lora** for headings/serif accents, **Inter** for everything else — fonts already loaded in `assets/fonts`. Radii: cards 18-20, inner cards 12-14, buttons 10-12, pills 999. Shadow: `#000 y+4 blur 22 opacity 0.05`.

---

## Category theming

The prototype's signature interaction. Implementation:

1. **Extend `CATEGORY_COLOR_THEME`** in `constants/themes.ts` to include an accent quartet per category (`color`, `mid`, `tint`, `shadow`). Prototype uses:

   ```ts
   health        #34B87A / #2A9564 / #E5F4EC
   finance       #3B82C4 / #2E6BA5 / #E6EFF7
   career        #E8853D / #C86D28 / #FBEDDF
   creative      #9B5DE5 / #7C43C4 / #F0E7FA
   education     #2CAAA1 / #218C85 / #E1F1EF
   relationships #E85D75 / #C7455F / #FCE6EC
   growth        #D4A843 / #B4892E / #F6EBD3
   ```

2. **Categories don't match the DB schema.** `GOAL_CATEGORIES` today: `body | mind | money | create | connect | contribute` (6). Prototype uses 7 per the design brief (Health, Finance, Career, Creative, Education, Relationships, Growth). Product decision required — options:
   - **(A) Map** prototype categories → existing DB categories (`health → body`, `finance → money`, `career → create`, `creative → create`, `education → mind`, `relationships → connect`, `growth → mind`). Lossy; drops the 7-way distinction.
   - **(B) Extend** `GoalCategory` enum + DB check constraint to include the new categories. Migration required.
   - **Recommended:** (B). Simple ALTER on the check constraint; keeps taxonomy honest.

3. **Apply the accent** by threading `useMemo(() => CATEGORY_COLOR_THEME[category], [category])` into the top of the wizard screen and passing to child components (or via a lightweight `CategoryThemeContext`). React Native has no CSS variables — pass hex through props/context.

4. **Transitions** — RN has no CSS transitions; use `Animated.timing` on color-interpolated values (300-400ms). Optional polish; can ship without and add later.

---

## Tracking template packs

`TEMPLATES` in the prototype (`c_dc_js`) is the source of truth for suggested milestones and metrics per category. Extract to a plain module:

```
lib/goals/templates.ts     ← export TEMPLATES per category
```

`createGoalWithMilestonesAndTrackers` already accepts the shape. Just call it on submit.

**Tracker types mismatch:** prototype cycles through `Habit · Counter · Checklist · Timer`. DB `GoalTrackerType` today: `counter | habit | checklist`. Options:
- **(A)** Drop `Timer` from the prototype cycle — recommended for scope.
- **(B)** Add `timer` to `GoalTrackerType` + DB + tracker service. Backend-only, no UI cost.

---

## State shape (wizard hook)

```ts
type WizardState = {
  step: 1 | 2 | 3 | 4;
  outcome: string;
  category: GoalCategory;
  suggestionState: 'visible' | 'applied' | 'dismissed';
  reason: string;
  preset: '30' | '60' | '90' | 'custom';
  customDate: string;              // ISO YYYY-MM-DD
  daysPerWeek: number;             // 1-7
  milestones: GoalMilestoneInput[];
  trackers: TrackerInput[];        // core + toggled-on optionals
  isPrivate: boolean;
  skipTracking: boolean;
};
```

All fields map to `ManualGoalCreationInput` at submit time. No new persistence.

---

## What NOT to port from the prototype

- The `<x-dc>` / `<sc-if>` / `<sc-for>` runtime — DC-only, ignore.
- Contenteditable text nodes — use `TextInput` for editable fields.
- The `--accent` CSS variable trick — use RN props / context (see above).
- Inline SVG for the success checkmark — replace with the existing icon convention or a small Lottie.
- `window.__dc` debug hook — designer testing only.
- The desktop sidebar shell — the app already has `Sidebar` + `AppHeader`. Wrap the wizard in the existing app chrome.

---

## Rollout order (suggested)

1. **Extract templates** to `lib/goals/templates.ts`. No UI wiring yet.
2. **Add step router** to `app/goals/create.tsx` (keep the file, swap the body for a 4-step switch). Existing submit + hydration stays.
3. **Ship Step 1** first (biggest UX shift) behind a flag. Old form remains for fallback.
4. **Ship Steps 2-4** once category theming context is in place.
5. **Decide** on category taxonomy (map vs extend) — this is the only real product decision blocking full parity with the design.

Everything else is straight visual re-composition on existing primitives.
