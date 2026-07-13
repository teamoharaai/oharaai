# Audit: Existing `category` Display Conventions

Read-only. Scope: how the 6 `goals.category` values (`body`, `mind`,
`money`, `create`, `connect`, `contribute` — enum defined in
`lib/goals/schema.ts:1-8` as `GOAL_CATEGORIES`) are currently labeled,
colored, and iconified across existing UI. No implementation, no code
changes.

---

## 1. Display label per category value

**Every read site renders `goal.category` verbatim, lowercase, with no
label map and no text-transform.**

| Site | Code |
|---|---|
| `features/goals/components/GoalCard.tsx:76` | `<Badge label={goal.category} variant="category" />` |
| `features/goals/components/GoalDetailHeader.tsx:92` | `<Badge label={goal.category} variant="category" />` |
| `features/projects/components/ProjectCard.tsx:147` | `<GoalRingCard ... category={goal.category} ... />` → `GoalRingCard.tsx:70` → `<Badge label={category} variant="category" />` |

- `Badge` (`components/ui/Badge.tsx:6-9`) takes `label: string` and renders
  it with a literal string prefix only for the `ai` variant (`✦ `,
  line 23) — no other transform.
- The `badge-text` Typography variant it renders through
  (`components/ui/Typography.tsx:26`, `'font-sans text-[11px]
  font-inter-medium'`) has no `textTransform`/`capitalize` class.
- Checked `ProjectCard.tsx` for a local `capitalize`/`toUpperCase` call on
  `category` — none found.

**Result:** `body` renders as literal `"body"`, not `"Body"`. Same for all
6 values — `mind`, `money`, `create`, `connect`, `contribute` all render
lowercase, exactly as stored. There is no existing "Body"/"Mind"/etc.
display-label mapping anywhere in the codebase today. A new selector
introducing Title Case labels would be a new convention, not a reuse of
an existing one.

One inline doc comment is misleading on this point:
`GoalRingCard.tsx:10` — `/** Category label shown in the chip (e.g.
"Fitness"). */` — describes an aspirational/example label ("Fitness")
that was never true for this schema; `fitness` was never one of the 6
`GOAL_CATEGORIES` values (see §5). Treat this comment as stale, not as
evidence of a real convention.

---

## 2. Color/theme mapping per category

There are **two different, non-agreeing category→color mappings** in the
codebase, plus one dead one.

### 2a. `lib/db/goals.ts:18-25` — `CATEGORY_THEME` (correct keys, real effect)

```ts
const CATEGORY_THEME: Record<string, GoalTheme> = {
  body: 'ember',
  mind: 'lavender',
  money: 'slate',
  create: 'sunset',
  connect: 'coral',
  contribute: 'forest',
};
```

This is the **only mapping keyed by the actual 6 `GOAL_CATEGORIES`
values.** It runs once, at goal-creation time
(`lib/db/goals.ts:63`, `CATEGORY_THEME[aiData.goal.category] ?? 'ocean'`),
to resolve a `GoalTheme` name that is then persisted permanently onto the
goal row as `color_theme` (`lib/db/goals.ts:79`). Downstream UI
(`GoalCard.tsx:21`, `GoalDetailHeader.tsx:36`) never re-derives color from
`category` — it reads the already-stored `goal.colorTheme` and looks up
`GOAL_THEMES[goal.colorTheme]` (`constants/themes.ts:1-10`) for the actual
hex values. So this is a **write-time-only, one-shot** mapping; there is
no live/reactive category→color function in the render path.

Resolved hex values (via `GOAL_THEMES` in `constants/themes.ts`), using
only the `accent` field (the value actually consumed by
`theme.accent` in `GoalCard.tsx`/`GoalDetailHeader.tsx`/`GoalRingCard.tsx`):

| Category | `GoalTheme` name | Accent hex | Full gradient |
|---|---|---|---|
| `body` | `ember` | `#E85D04` | `['#3D0814', '#9D0208', '#E85D04']` |
| `mind` | `lavender` | `#D6BCFA` | `['#2B2D42', '#8D99AE', '#D6BCFA']` |
| `money` | `slate` | `#94A3B8` | `['#1E293B', '#475569', '#94A3B8']` |
| `create` | `sunset` | `#D4A373` | `['#6B2737', '#D4A373', '#FEFAE0']` |
| `connect` | `coral` | `#FF8A80` | `['#4A1942', '#C84B6B', '#FF8A80']` |
| `contribute` | `forest` | `#52B788` | `['#1B4332', '#2D6A4F', '#52B788']` |

This accent color is used for: card left-border (`GoalCard.tsx:63`, at
`+ '99'` alpha), progress-bar fill (`GoalCard.tsx:96`), detail-header
left-border and progress ring (`GoalDetailHeader.tsx:79,189`), and
`GoalRingCard`'s ring stroke (via `ProjectCard.tsx:149`,
`GOAL_THEMES[theme].accent`). It is **never** used to color the category
`Badge` chip itself — see next point.

### 2b. The category `Badge` chip color is identical for all 6 categories

`Badge.tsx:18` — `variant="category"` always resolves to a single fixed
style, `{ bg: '#F0EDE6', text: '#4A7C5F' }`, regardless of which category
string is passed. `body`, `mind`, `money`, `create`, `connect`,
`contribute` chips are visually indistinguishable from one another (same
background beige, same green text) — the only thing that differs is the
text content. **Category-specific color only shows up on the accent
elements (border/ring/progress-bar), never on the badge/chip itself.**

### 2c. `constants/themes.ts:14-23` — `CATEGORY_THEME_MAP` (wrong keys, dead for goals)

```ts
export const CATEGORY_THEME_MAP: Record<string, GoalTheme> = {
  fitness: 'ember',
  health: 'mint',
  career: 'ocean',
  education: 'lavender',
  creative: 'sunset',
  social: 'coral',
  financial: 'slate',
  personal: 'forest',
};
```

Keyed by `fitness/health/career/education/creative/social/financial/
personal` — **none of these match any of the 6 `GOAL_CATEGORIES` values.**
Its only consumer is `ProjectCard.tsx:137`:
`CATEGORY_THEME_MAP[goal.category] ?? goal.colorTheme` — since
`goal.category` is always one of the 6 real enum values, this lookup
**always misses** and always falls through to `goal.colorTheme` (§2a's
persisted value). Functionally a no-op today; see §5 for the explicit
answer on collision risk.

---

## 3. Icon/glyph per category

**None found, anywhere.** Grepped every component that touches
`goal.category` (`GoalCard.tsx`, `GoalDetailHeader.tsx`, `GoalRingCard.tsx`,
`ProjectCard.tsx`, `Badge.tsx`) for icon/emoji/glyph usage:

- The only icon in these components is `BrandIcon` (via `GoalTitleRow.tsx`
  / `ProjectTitleRow.tsx`), which renders next to the goal/project
  **title**, not the category badge — it's the Ohara brand mark, static,
  unrelated to category.
- `Ionicons` usage in the goals feature (`EchoTrail.tsx`, `VaultItemCard.tsx`)
  is for Echo-link and vault-item-type glyphs, not category.
- No emoji, no per-category `Ionicons` name, no SVG/image asset keyed by
  `body`/`mind`/`money`/`create`/`connect`/`contribute` exists in the
  codebase.

A new selector introducing category icons would be a wholly new visual
element, not a reuse of an existing one.

---

## 4. Is there a single canonical source, or is it duplicated/inconsistent?

**Duplicated, and inconsistent.** Two separate `Record<string, GoalTheme>`
constants exist for category→color, with different key sets, in different
files, owned by different lanes per root `CLAUDE.md`'s File Ownership
table:

| Constant | File | Owner (per root CLAUDE.md) | Keys | Status |
|---|---|---|---|---|
| `CATEGORY_THEME` | `lib/db/goals.ts:18-25` | CTO (`lib/db/*`) | `body/mind/money/create/connect/contribute` (correct) | Live — the only mapping ever actually applied to a real goal category, but only at creation time |
| `CATEGORY_THEME_MAP` | `constants/themes.ts:14-23` | CEO (`constants/*`) | `fitness/health/career/education/creative/social/financial/personal` (wrong for goals) | Dead for goal categories — always misses, silently falls back via `??` in its one call site |

There is no single canonical `category → { label, color, icon }` registry.
Label formatting (§1) has no source at all (raw pass-through). Color has
two disagreeing sources (§2). Icon has no source (§3). A new category
selector cannot "reuse the existing mapping" in the singular — it would
need to either extend `lib/db/goals.ts`'s `CATEGORY_THEME` (the correct,
currently-authoritative one) or introduce a new shared constant, and
explicitly avoid `constants/themes.ts`'s `CATEGORY_THEME_MAP` given §5.

---

## 5. Is `ProjectCard.tsx`'s `CATEGORY_THEME_MAP` a separate, already-broken
mapping unrelated to `goals.category`, and does it risk colliding with a
new selector?

**Confirmed separate and already broken, per §2c.** It is not a variant or
subset of `goals.category` — its 8 keys (`fitness`, `health`, `career`,
`education`, `creative`, `social`, `financial`, `personal`) do not
overlap at all with the 6 real `GOAL_CATEGORIES` values (`body`, `mind`,
`money`, `create`, `connect`, `contribute`). It reads like a mapping built
against an earlier/different category taxonomy that predates the current
6-value enum in `lib/goals/schema.ts`, then left in place after the enum
changed. Its one call site (`ProjectCard.tsx:137`) only produces correct
results today *by accident*, via the `?? goal.colorTheme` fallback,
never via an actual key match.

**Collision risk for a new category selector:** Low direct collision risk
(the new selector will presumably use the real 6-value enum, so it won't
key-match `CATEGORY_THEME_MAP` either) — but real *confusion* risk: a
future editor extending category theming might naturally reach for
`constants/themes.ts`'s `CATEGORY_THEME_MAP` since it lives in the
CEO-owned `constants/*` canonical-registry location and has the more
"official-sounding" name, when the actually-live mapping is the
CTO-owned one in `lib/db/goals.ts`. Not fixing per scope — flagging only.

---

## Explicitly out of scope (not evaluated)

UI placement/layout decisions, migration files, validator changes, fixing
the `ProjectCard.tsx` mismatch.

---

**Output confirmation:** this audit wrote only to
`design/design_handoff_manual_goal_creation/audit_category_conventions.md`.
No other file was modified.
