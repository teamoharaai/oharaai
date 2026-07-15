# Handoff: Goal Decay & Momentum Redesign

## Overview
This package redesigns the Ohara **Goals** experience around one mental-model shift:

> **The ring measures time, not completion.** A goal's ring fills as its deadline approaches. When the deadline arrives the goal *ends* — it is not "failed." The user can then **extend** the goal into a new **phase** (called *Momentum*), which carries forward a locked summary of what they built, plus an optional reflection.

It covers five connected views:
1. **Dashboard** — desktop layout (emerald sidebar + centered ~900px content), Today / Projects / Goals sections.
2. **Goal detail** — with a *lifecycle scrubber* demonstrating the ring across Early → Near deadline → Ended.
3. **Extend flow** — a 3-step modal: ended summary → deadline picker → reflection.
4. **Momentum detail** — the new phase: fresh ring, editable milestones, a locked **"What You Built"** summary + reflection.
5. **Superseded goal** — the original phase, muted and read-only, with a "Continued in Phase 2" link.

## About the Design Files
The file in this bundle — `Ohara.dc.html` — is a **design reference created in HTML**. It is a prototype showing the intended look and behavior; it is **not production code to copy**. Your task is to **recreate this design inside the existing Expo / React-Native codebase** (`oharaai/`) using its established patterns, components, and constants. The HTML uses inline styles and a small state class purely to demonstrate the interactions; translate those into React-Native `StyleSheet`/NativeWind and your existing component library.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and interactions are final and should be recreated faithfully. All values below are exact and reconciled against your existing `constants/colors.ts` and `constants/themes.ts` — prefer the codebase tokens over re-typing hex where a token already exists.

---

## Design Tokens (all reconciled to your codebase)

### Surfaces & text — use `LIGHT_THEME` in `constants/colors.ts`
| Role | Hex | Notes |
|---|---|---|
| Page background | `#F8F4EC` | `LIGHT_THEME.background.page` |
| Card / surface | `#FFFFFF` | primary cards |
| Inset surface | `#FCFAF4` | goal tiles inside a section |
| Warm inset (locked summary) | `#F6F0E4` | "What You Built" panel |
| Card border | `#EAE7E0` / `#EDE6D8` | hairline borders |
| Warm border (locked) | `#E7DEC9` | |
| Text primary | `#211F1A` | |
| Text secondary | `#8A8172` | labels, descriptions |
| Text muted | `#A79E8E` | metadata, due dates |
| Sidebar background | `#1E3226` | deep emerald |
| Sidebar active item | `#2A4436` | |
| Sidebar text | `#EDE7DA` (active) / `#8FA294` (inactive) | |

### Accents
| Role | Hex |
|---|---|
| Primary action / links | `#4A7C5F` (hover `#3B6A50`) |
| Dark button (Extend / Next) | bg `#1E3226`, text `#EDE7DA` |
| Success / progress fill | `#52B788` |
| Measurable "+" button | bg `rgba(82,183,136,0.10)`, text `#3F8F63` |
| Momentum badge | bg `#E8F5EF`, text `#2F8F6D` |
| Warm caption/reflection accent | `#8A6A3E` / `#B79A6A` |

### Category theme colors — already in `constants/themes.ts` (`GOAL_THEMES`)
Body→`forest #52B788`, Mind→`lavender #D6BCFA`, Create→`ocean #5FA8D3` / `sunset #D4A373` / `coral #FF8A80`. Use the existing map; do not hardcode.

### Ring urgency escalation (NEW — add to ring color logic)
The base ring stroke uses the category theme color, but escalates as the deadline nears:
- `pct < 75` → theme accent color
- `75 ≤ pct < 90` → `#E0863E` (amber)
- `pct ≥ 90` → `#C0483A` (red)

This is the one net-new rule; wire it into whatever resolves the ring color (see `ProgressRing.web.tsx` / `ringProgress.ts`).

### Typography
- **Body / UI**: Inter — weights 400/500/600/700/800 (your `Typography.tsx` variants).
- **Display / editorial**: Lora *italic* — greeting, section headlines inside cards ("This goal has ended.", modal titles), and reflection quotes. Use italic 600 for headlines, italic 400–500 for reflection body.
- Scale used: greeting 27px, goal-detail title 26/32, card headline 19–22px, body 14/21, secondary 13/20, label 11px uppercase `letter-spacing:1.5px`, metadata 12px.

### Radius & shadow
- Cards `16px`; tiles/measurables `12px`; modal `20px`; pills/buttons `999px`; badges `8px`; checklist checkbox `4px`.
- Card shadow: `0 2px 12px rgba(30,25,15,0.04)`; goal-detail header `0 2px 16px rgba(0,0,0,0.05)`; measurable `0 1px 6px rgba(0,0,0,0.04)`; modal `0 24px 60px rgba(0,0,0,0.25)`.
- Goal-detail header has a **4px left accent border** in the category color (`border-left:4px solid #52B788`). Superseded uses `#C7C0B2`.

### Motion
- Modal scrim: `opacity 0→1`, 0.2s ease.
- Modal sheet: `opacity 0→1` + `translateY(14px→0)`, 0.28s `cubic-bezier(0.2,0.7,0.2,1)`.
- Route change resets content scroll to top.

---

## The Ring Math (core — matches `utils/ringProgress.ts`)
The ring is **time-based**. Given `createdAt` and `deadline`:

```
elapsed  = now - createdAt
total    = deadline - createdAt
pct      = clamp(elapsed / total * 100, 0, 100)
```

- No deadline → fall back to your existing completion-based behavior (unchanged).
- `pct >= 100` → goal is **ended** (deadline passed). Ring shows 100% and switches to the "ended" presentation.
- Days-left readout: `ceil((deadline - now) / 86400000)`.

SVG ring geometry (as in `ProgressRing.web.tsx`): `r = (size - stroke*2)/2`, `circ = 2πr`, `dashoffset = circ - (pct/100)*circ`, rotate container `-90deg`, `stroke-linecap:round`, track stroke `#EDE6D8`.

Ring sizes used: dashboard tiles **56px / stroke 5**, goal-detail header **72px / stroke 6**.

---

## Screens / Views

### 1. Dashboard  (`app/(app)/dashboard.tsx`)
**Layout:** persistent 220px emerald sidebar (sticky, full height) + scrollable `<main>` whose inner column is `max-width:900px`, centered, padding `28px 36px 72px`.

- **Header:** Lora-italic greeting ("Good morning, Jordan.") + secondary date line (`weekday, Month day`).
- **Today card** (white, 16px): uppercase "TODAY" label with `today-logo.png`. Rows = circular checkbox (24px, `border:2px` — `#C9D4CD` unchecked, `#1E3226` checked with `✓`) + parent-goal caption (11px muted) + task text (14px; completed rows strike to `#A79E8E`).
- **Projects section:** uppercase "PROJECTS" label + `+` (`#4A7C5F`). Each project = white card, 16px radius, border `#EDE6D8`, `project-logo.png` + title (15.5px/500) + description (12px muted) + chevron toggle (`⌄`/`›`). **Expanded:** hairline divider then a 2-col grid (`gap:14px`) of goal tiles.
- **Goals section:** uppercase "GOALS" label + `+`, then a 2-col grid of goal tiles.

**Goal tile:** inset `#FCFAF4`, border `#EFE9DC`, 16px radius, padding 18px. Left = 56px ring with centered `NN%` (12px/700). Right = category badge (`#F0EDE6` bg, `#4A7C5F` text, 8px radius) + `goal-mark.png` + title (14.5px/600). Footer row: activity summary (12px `#8A8172`) left, due date right (`#A79E8E`, or `#C0483A` when `pct≥90`). Clickable tiles get `box-shadow:0 4px 16px rgba(30,25,15,0.10)` on hover.

### 2. Goal detail  (`app/(app)/goals/[id]/index.tsx`)
Back link "‹ Goals" (`#4A7C5F`). Header card (white, 4px left accent, 16px radius):
- Category badge + status badge (active `#E8F5EF`/`#4A7C5F`; ended `#F7E6E2`/`#C0483A`).
- `goal-mark.png` (24px) + title 26/32.
- Description (14/21 `#8A8172`).
- **Lifecycle scrubber** (prototype-only teaching aid — see note): segmented control (`#F0EDE6` track, 10px radius, 3px pad) with Early / Near deadline / Ended; active segment = white pill with `0 1px 3px rgba(0,0,0,0.08)`.
- Divider, then **progress row**: big days-left number (44px/700 in ring color) + "DAYS LEFT" caption, subtext "This ring fills as the deadline nears — not by how much you've logged."; right = 72px ring.
- **Time-vs-completion callout** (`#FBF1E4` bg, `#F0DCC0` border): "⏳ Your ring is NN% full because the deadline is close — but you've logged **2 of 5 lbs**. The ring measures time, not completion."
- **Ended state** replaces the days number with "Deadline passed" (`#E85D04`) and shows an ended card: Lora "This goal has ended." + copy + **[Extend into a new phase]** (dark pill) / **[Not now]** (ghost pill). Milestones dim to `opacity:0.6` and `+` buttons hide.

**Milestones** (white 16px card): three measurable types, matching your `MeasurableCard.tsx`:
- **counter** ("Track weight" — `2/5 lbs`): value + `+` pill + 4px progress bar (`#52B788` on `#EAE7E0`).
- **habit** ("Go to the gym" — `8/12 weeks`, "3x / week"): same pattern.
- **checklist** ("Sign up for a gym"): 20px square checkbox, checked `#52B788`, label strikes through.

> **Note on the scrubber:** the Early/Near/Ended toggle exists only to demonstrate the ring lifecycle in the prototype. In production the state is derived from `deadline` vs `now` — do **not** ship the toggle.

### 3. Extend flow (modal over goal detail)
Centered modal, max-width 468px, 20px radius, scrim `rgba(30,25,15,0.45)`. Top progress = 3 segment bars (filled `#1E3226`, empty `#E7DEC9`).
- **Step 1 — Summary:** Lora "This goal has ended." + copy. Warm panel (`#F6F0E4`) listing what was tracked: `Track weight 2/5 lbs`, `Gym visits 8/12 weeks`, `Sign up for a gym — Done` (green). Buttons: [Not now] ghost / [Extend into a new phase] dark.
- **Step 2 — Deadline:** Lora "How long for this next phase?" + three choice buttons 30/60/90 days (selected = `#1E3226` border, `#EEF4F0` bg, `#1E3226` text). Live "New deadline" readout (`now + N days`, "Mon D"). [Back] / [Next].
- **Step 3 — Reflection:** Lora "Anything to remember from this phase?" + Lora-italic textarea (`#FCFAF4`, `#D8D2C8` border, placeholder "I didn't hit the number, but…"). [Skip] / [Start next phase] → navigates to Momentum detail.

### 4. Momentum detail (the new phase)
Same header shape as goal detail but with a **Momentum · Phase 2** badge (`↻`, `#E8F5EF`/`#2F8F6D`) and subtext "You pushed toward this once already. This phase carries that momentum forward." Fresh 72px ring at ~8% (`#52B788`), "60 days left", "Fresh deadline · <date>. The ring starts empty again."

- **Milestones:** fresh/editable copies (counters reset to 0, checklist "Sign up for a gym" shown as *carried over*).
- **"What You Built"** locked summary (`#F6F0E4`/`#E7DEC9`): 🔒 label, "From your first 60 days · locked and carried forward", then rows with warm progress bars (`#B79A6A` on `#E7DEC9`): Track weight `2/5 lbs` 40%, Gym visits `8/12 weeks` 66%, Sign up for a gym `Done` 100%. Below a divider, the **Reflection** quote in Lora italic + "— reflected <date>".
- Footer link "View the original goal →" → Superseded view.

### 5. Superseded goal (read-only original phase)
Back link "‹ Back to current phase". Green **"Continued"** banner (`#E8F5EF`/`#CDE7DC`) → tapping returns to Phase 2. Header card is **muted** (`#F5F2EA` bg, `#C7C0B2` left accent, greyed title `#6E675B`), badges: Body / archived / read-only. Ring is 100% grey (`#B7B0A2`), "Deadline passed". Final milestones render static (no `+`), bars in `#C7C0B2`. Reflection shown read-only.

---

## State Management
Per-goal, the fields the redesign adds/uses:
- `deadline: Date | null`, `createdAt: Date` → drive ring `pct` and `ended` (see ring math).
- `status: 'active' | 'ended' | 'archived'` — derived from deadline; `archived` when superseded.
- `phase: number` and `previousPhaseId` / `nextPhaseId` links between phases (superseded ↔ momentum).
- `lockedSummary`: snapshot of the prior phase's measurables (label, value, pct) + `reflection: string` + `reflectedAt: Date`. Immutable once a new phase starts.
- Measurable values (counter/habit) increment via `+`; checklist toggles complete.

**Transitions:** deadline passes → `ended` → Extend flow captures `{deadlineDays, reflection}` → new phase created with `phase+1`, empty ring, carried checklist, and a frozen `lockedSummary` from the ended phase; the ended phase becomes `archived`/read-only.

## Interactions & Behavior
- Dashboard goal tile → goal detail (only wired for the primary goal in the prototype).
- Ended goal → Extend modal (3 steps, Back/Next, Skip/Start).
- Start next phase → Momentum detail; scroll resets to top on every route change.
- Momentum → "View the original goal" → Superseded; Superseded "Continued" banner → back to Momentum.
- Counter/habit `+` buttons live-increment and grow the progress bar; disabled/hidden once ended.

## Assets
Brand icons (copied from `assets/brand/` in your repo — already present there, included here for reference):
`ohara-logo.png`, `goals-logo.png`, `echo-logo.png`, `goal-mark.png`, `today-logo.png`, `project-logo.png`.

## Files
- `Ohara.dc.html` — the full interactive design reference (all five views + extend modal). Open in any browser.
- Existing codebase files to build on: `app/(app)/dashboard.tsx`, `app/(app)/goals/[id]/index.tsx`, `features/goals/components/GoalRingCard.tsx`, `components/ui/ProgressRing.web.tsx`, `features/goals/utils/ringProgress.ts`, `features/goals/components/MeasurableCard.tsx`, `constants/colors.ts`, `constants/themes.ts`, `components/ui/Typography.tsx`, `components/ui/Badge.tsx`.
