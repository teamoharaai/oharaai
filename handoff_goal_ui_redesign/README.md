# Handoff: Echo Goal Creation — Focused Field (v2)

**Prototype:** `AI Goal Creation Flow.dc.html` (bundled in this folder)
**Target repo:** `oharaai/` — Expo / React Native + NativeWind + Supabase + Zustand
**Existing implementation:** `features/goals/components/AIGoalCreation.tsx` (+ `GoalTemplateCards.tsx`, `GoalReviewScreen.tsx`)

The bundled HTML file is a **design reference** — a static prototype demonstrating the intended visual result and interaction language. It is not code to ship. The task is to bring the existing `AIGoalCreation.tsx` flow up to visual parity with this reference by editing the components already in the repo. **Nothing in the API, DB, or wizard state changes.** This is a visual + copy pass, plus one new UI affordance (Save Draft) that maps to an existing DB status.

## Fidelity

**High-fidelity.** Exact hex values, typography, spacing, and layout are given below. Recreate pixel-perfectly using existing primitives (`Button`, `Card`, `Typography`, `useThemeColors`) — do not introduce new dependencies.

## What changed vs. the current implementation

| # | Screen | What's new | Existing file to edit |
|---|---|---|---|
| 1 | Entry | Segmented **Build it myself / Chat with Echo** toggle above the composer; large serif prompt ("What do you want to work on?"); suggestion chips | New screen — sits above `AIGoalCreation.tsx`, or add as `phase === 'entry'` at the top of the same component |
| 2 | Conversation | Bubble-less chat: Echo in **Lora serif**, user in **Inter, indented right**, no avatars. Closes with **two goal drafts** (Concrete vs. Open) rendered inline as choice cards, not three | `ChatMessageList.tsx`, `AIGoalCreation.tsx`, `GoalTemplateCards.tsx` |
| 3 | Templates | Stacked cards with one expanded ("hover · full detail") state; centered Echo lede above list | `GoalTemplateCards.tsx` |
| 4 | Review | Adds **Save draft** outlined button beside **Create this goal** in the sticky footer | `GoalReviewScreen.tsx` |
| 5 | Success | Radial-gradient wash, larger check chip, Lora headline | `AIGoalCreation.tsx` (success phase) |

The **defining change is #2**: the conversation view now presents exactly **two options** at the end (Concrete + Open) instead of the three-template selector. This does not mean the API must return two — the `templates: GoalTemplateResponse` still returns N templates. What changes is the **user-facing summarization** at the end of chat: Echo picks a concrete-vs-open framing and renders that pair. See §Two-option surfacing below.

---

## Screens

### 1 — Entry (`phase: 'entry'`)

**Layout.** Full-height column, sidebar unchanged. Center column, max-width 640.
- Top: segmented toggle (2 pills) — "Build it myself" (muted) / "✦ Chat with Echo" (filled `#34B87A`, text `#0B0B0B`).
- Middle: Lora 52 / 1.05 / -0.9 letter-spacing, "What do you want to work on?" — pure white on dark, `#211F1A` on light.
- Below: 15.5 Inter secondary copy, 460px max-width, centered.
- Composer card: dark `#1A1A1A`, 1px `#2D2D2D`, radius 16, inner min-height 56 for the placeholder line ("I want to get back into running—") in Lora 22 muted `#4A4A4A`. Footer row: 11.5 muted hint on left, primary Send button on right.
- Below composer: three suggestion chips (`#1D1D1D` bg, 1px `#2A2A2A` border, radius 999).

**Behavior.**
- Toggling to "Build it myself" navigates to `app/goals/create.tsx` (existing manual wizard).
- Typing + Enter → `phase: 'chatting'`, seeds the first user message.
- Suggestion-chip tap prefills the composer.

### 2 — Conversation (`phase: 'chatting'`)

**Layout.** Sidebar unchanged. Main column split into three regions (no bubbles anywhere):

```
┌─ header row (breadcrumb + Myself/Echo toggle) ──── border-bottom
│
│  padding: 18 72 12
│  gap: 14
│
│  ┌─ Echo turn                            ← label green pill dot + "ECHO"
│  │  Lora 16 / 1.5 / EDE7DA               ← body copy, no card, no bg
│  │
│  │  ┌─ You turn                            (right-aligned, indented 22%)
│  │  │  Inter 13.5 / 1.5 / B8B8B8           text-align: right
│  │  │  Label: "YOU" 10 tracking 1.5
│  │  │
│  │  Echo turn …
│  │  You turn …
│  │
│  │  Echo turn — closing beat
│  │  Lora 15.5 / 1.55
│  │
│  │  ┌────────── grid 1fr 1fr, gap 10 ──────────┐
│  │  │  Option A card         │  Option B card  │  ← see §Option Cards
│  │  └────────────────────────┴─────────────────┘
│
│  padding: 10 40 14
│  ┌─ Reply composer (dark card, radius 12) ──────┐
│  │  "Reply to Echo…"                        [↵] │
│  └───────────────────────────────────────────────┘
```

**Colors (dark theme).**
- Echo label green: `#34B87A`, dot 5×5 with `box-shadow: 0 0 8px #34B87A`.
- Echo body: `#EDE7DA` (`colors.text.inverse`).
- You label: `#6B6B6B` (`colors.text.muted`).
- You body: `#B8B8B8` (`colors.text.secondary`).
- Divider above composer: 1px `#232323` (`colors.border.divider`).

**Option Cards (the pair).**
- Container: grid `1fr 1fr` with 10px gap.
- **Card A · Concrete** — the strict, measurable framing.
  - Background `#1A1A1A`, border `1.5px #34B87A`, radius 12, padding `12 14`.
  - Positioned label pill top-left, offset `-9` above: bg `#34B87A`, text `#0B0B0B`, 8.5px 700 tracking 1.5 uppercase, "CONCRETE".
  - Overline: 9px tracking 1.5 upper `#34B87A` — "Option A · strict to the goal".
  - Title: Lora 15 / 1.2 / weight 600 / letter-spacing -0.2, color `#FFFFFF`. Ex: "Run a 5K in under 30 minutes by Aug 30."
  - Subtitle: Lora italic 11.5 / 1.45 / `#8F8F8F`. Ex: "A hard number, a hard date. Every week measured against pace."
  - Meta list: 3 rows of `label · value` at 10.5px, top border `1px #262626` at 8px above.
- **Card B · Open** — the abstract, felt-experience framing.
  - Background `#161616`, 1px `#262626`, radius 12, padding `12 14`.
  - Label pill "OPEN" — bg `#1D1D1D`, text `#B8B8B8`, 1px `#2D2D2D` border.
  - Overline: 9px tracking 1.5 upper `#8F8F8F` — "Option B · more abstract".
  - Title: same Lora treatment; softer copy. Ex: "Feel like a runner again by end of summer."
  - Subtitle Lora italic 11.5 / `#8F8F8F`.
  - Meta list same structure; values lean on qualitative language ("Late September", "Most mornings", "Reflection · felt-shift").

Tap either card → advance to Review (`phase: 'reviewing'`) with the corresponding `template` set. Card A maps to a `template` where `smart_data.frequency` is set + concrete deadline; Card B maps to a template where `smart_data.frequency = null` (narrative/open goal).

### 3 — Templates (existing route from AI)

Kept structurally identical to today's `GoalTemplateCards` but restyled to match the dark palette:
- Stacked (not grid), 1-column, max-width 760, centered.
- Non-selected cards: `#1A1A1A`, 1px `#262626`, radius 16, padding `18 22`.
- Selected/expanded card: `#1D1D1D`, `1.5px #34B87A`, `24px 48px shadow rgba(52,184,122,.14)`, expanded content (description, 2×2 meta grid, roadmap list, tracker chips, "Choose this one" primary button).
- Above the list: centered Echo lede — 10.5px tracking 2.5 upper `#34B87A` label, then Lora 22 / 1.35 / `#FFFFFF` sentence.

Below the list: subtle "Don't love any? Ask Echo to try again" prompt.

### 4 — Review (`phase: 'reviewing'`)

Kept structurally identical to today's `GoalReviewScreen`, restyled dark, plus **one new button in the sticky footer**:

**Sticky footer, left → right:**
1. "← Back" text link (`#8F8F8F`).
2. Spacer.
3. "Everything look honest?" hint (`#6B6B6B`, 12px).
4. **Save draft** (new) — outlined button:
   - Background `transparent`, 1px `#3A3A3A`, radius 10, padding `11 20`, text `#EDE7DA` Inter 14/500.
   - Prefix glyph "◐" `#8F8F8F` at 12px, 7px gap.
5. **Create this goal ✓** — filled primary button:
   - Background `#34B87A`, text `#0B0B0B`, radius 10, padding `12 26`, weight 600, shadow `0 4 14 rgba(52,184,122,.24)`.

**Save draft behavior.** Persists the current review payload with `status: 'draft'` (this status already exists on the goals table — see `types/supabase.ts`). Reuses the same `POST /api/goals` endpoint with `status: 'draft'` set on the payload; on success, navigates to `/goals` and shows a toast "Saved as draft — pick it back up anytime".

### 5 — Success (`phase: 'success'`)

- Radial gradient behind card: `radial-gradient(circle at 50% 40%, rgba(52,184,122,.14), transparent 60%)`.
- Circular check chip: 88×88, `#222A23` fill, `#34B87A` stroke check, ring shadow `0 0 0 6px rgba(52,184,122,.08), 0 0 40px rgba(52,184,122,.24)`.
- Overline "GOAL CREATED" `#34B87A` 10.5 tracking 2.5.
- Headline: Lora 44 / 1.1 / -0.7, "You're on the clock."

---

## Reuse from the existing codebase

**Do not build new; wire these:**

| Design piece | Existing file |
|---|---|
| Chat state, phases, submit, toast | `features/goals/components/AIGoalCreation.tsx` — keep the state machine, restyle the render |
| Message list rewrite (no bubbles) | `components/ui/ChatMessageList.tsx` — see `components/FocusedChatMessageList.tsx` in this bundle for the exact replacement JSX |
| Chat option cards | New sub-component; see `components/EchoGoalDraftCards.tsx` in this bundle |
| Template list dark restyle | `features/goals/components/GoalTemplateCards.tsx` — dark tokens + expanded state |
| Review footer + Save draft | `features/goals/components/GoalReviewScreen.tsx` — add `onSaveDraft` prop |
| Save-draft submit | Extend `submitGoal` in `AIGoalCreation.tsx` with a `status: 'draft'` branch; DB accepts it |
| Colors | `constants/colors.ts` — `DARK_THEME` covers everything; the accent green `#34B87A` maps to what `getCategoryAccentTheme('health').color` already returns |
| Category theming | `constants/themes.ts` — `getCategoryAccentTheme` already returns the exact `#34B87A / #2A9564 / #E5F4EC / rgba(52,184,122,.28)` quartet |
| Fonts | `assets/fonts` — Lora + Inter already loaded. `Typography` variant `serifDisplay` if it exists; otherwise pass `fontFamily: 'Lora'` inline |

**No new API. No new tables. No migrations.** `status = 'draft'` is already on `goals` per `types/supabase.ts`.

---

## Design tokens (dark, from prototype)

Use `useThemeColors()` — the numbers below map to the dark palette in `constants/colors.ts`.

```
--surface-page          #141414   background.page
--surface-sidebar       #0E0E0E   background.sidebar (dark; prototype uses this shade)
--surface-card          #1A1A1A   background.card (adjusted)
--surface-card-alt      #161616   nested card variant
--surface-input         #1D1D1D   background.input
--surface-selected      #222A23   background.selectedRow (green tint)
--border-warm           #292929   border.warm
--border-divider        #232323   border.divider
--border-input          #2D2D2D   border.input
--text-primary          #FFFFFF   text.primary
--text-inverse          #EDE7DA   text.inverse (Echo body)
--text-secondary        #B8B8B8   text.secondary
--text-muted            #8F8F8F   text.muted
--text-faint            #6B6B6B
--accent-primary        #34B87A   accent.tealMid on dark (health category)
--accent-on             #0B0B0B   text on accent buttons
--accent-tint           #222A23   accent-tinted surface
--focus-glow            0 0 8px #34B87A   for the "listening" dot
```

**Typography.**
- Lora — serif, weights 400/500/600, ital 400/500/600 for Echo turns, cards' titles, headline hierarchy.
- Inter — sans, weights 400/500/600/700 for UI chrome, user messages, labels, meta rows.
- Never mix — Echo speaks Lora, user replies Inter, chrome Inter.

**Radii.** Buttons 9–10. Chips 999. Cards 12–16. Composer 12–14.

**Shadows.** Card default: `0 24px 60px rgba(0,0,0,.35), 0 2px 10px rgba(0,0,0,.2)`. Accent-selected: `0 12px 32px rgba(52,184,122,.14), 0 2px 10px rgba(0,0,0,.4)`.

---

## Interactions & Behavior

- **Segmented toggle (Entry).** Instant swap, no animation. "Build it myself" pushes `router.push('/goals/create')`. "Chat with Echo" is the current screen.
- **Composer submit.** Enter without shift sends. On send, phase transitions to `chatting`; the composer clears; existing loading dots (`isLoading` in `AIGoalCreation.tsx`) drive the typing indicator — restyle its color to `#34B87A`.
- **Option-card tap.** Sets `templateResponse` + `selectedIndex` and moves to `reviewing`. If the API returned >2 templates, the summarization step picks 2 (see below); the others remain accessible via a "See all drafts" secondary link at the bottom of the pair.
- **Save draft.** Same POST as Create, `status: 'draft'`, navigates to `/goals` and fires a Toast.
- **Create this goal.** Same as today; navigates to the goal detail page on success.

## Two-option surfacing (Concrete vs. Open)

The API contract is unchanged. When the templates payload arrives:

```ts
const concreteIdx = templates.findIndex(t => t.goal.smart_data.frequency != null);
const openIdx     = templates.findIndex(t => t.goal.smart_data.frequency == null);

// Fall back deterministically if the pair isn't found:
const concrete = concreteIdx >= 0 ? templates[concreteIdx] : templates[0];
const open     = openIdx     >= 0 ? templates[openIdx]     : templates[1] ?? templates[0];
```

Render `<EchoGoalDraftCards concrete={concrete} open={open} onSelect={…} />`. Below the pair, if `templates.length > 2`, show a text link "See all `{templates.length}` drafts" that takes the user to the existing full-list Templates screen (§3). This preserves the current UX for anyone who wants the full picker while making the default a curated pair.

## State shape (no change from today)

The `ChatPhase` union is extended by one value only:

```ts
type ChatPhase = 'entry' | 'chatting' | 'selecting' | 'reviewing' | 'success';
```

`'entry'` is the initial phase; today's initial `'chatting'` becomes `'entry'` first. `'selecting'` is only reached via the "See all drafts" fallback link.

Everything else in `AIGoalCreation.tsx` stays.

---

## Assets

- Brand marks (`assets/brand/ohara-logo.png`, `goals-logo.png`, `echo-logo.png`, `goal-mark.png`) already exist. Prototype references them at those exact paths.
- Fonts: Lora and Inter — already loaded, no new imports.
- No new icons. The "✦", "◐", "↵", "→" glyphs are unicode; do not swap for SVG.

---

## Files in this bundle

```
handoff/
  README.md                                  ← this file
  AI Goal Creation Flow.dc.html              ← the design reference (open in a browser)
  components/
    FocusedChatMessageList.tsx               ← drop-in replacement JSX for ChatMessageList (no bubbles)
    EchoGoalDraftCards.tsx                   ← the Concrete / Open pair
    SaveDraftButton.tsx                      ← the outlined footer button
  constants/
    focused-tokens.ts                        ← the exact color/type/spacing constants used by the prototype
```

The three component files are drop-in TypeScript skeletons written against the repo's existing conventions (`useThemeColors`, `Typography`, `Button`, `Pressable`). They compile without dependency changes; copy them into the paths noted in each header comment.

## Rollout order (suggested)

1. **Add `focused-tokens.ts`** into `constants/` — no consumer changes yet.
2. **Extend `ChatPhase`** in `AIGoalCreation.tsx` with `'entry'` and render an Entry screen for that phase. Keep the current chat body for `'chatting'`.
3. **Drop in `FocusedChatMessageList`** and swap it in behind a feature flag (`FEATURES.focusedFieldChat`). Existing message rendering stays under the flag off.
4. **Add `EchoGoalDraftCards`** and render it at the tail of the chat scroller when `templateResponse != null`. Wire the "See all drafts" fallback.
5. **Restyle `GoalTemplateCards`** with the dark tokens (single-column, expanded state).
6. **Restyle `GoalReviewScreen`** with the dark tokens; add `onSaveDraft` prop and the outlined button. Extend `submitGoal` with the draft branch.
7. **Restyle success phase** with the radial-gradient wash + larger check chip.
8. **Remove the flag** once QA passes and the old chat list is unused.

Everything else is visual re-composition on primitives that already exist.
