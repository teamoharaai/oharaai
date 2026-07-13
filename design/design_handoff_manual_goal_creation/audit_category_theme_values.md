# Audit: `CATEGORY_THEME` Values & Export Shape

Read-only audit. No code changes made.

## 1. Hex values for the 6 `colorTheme` tokens

`CATEGORY_THEME` in `lib/db/goals.ts` (lines 18–25) maps category → `GoalTheme`
token name, not directly to hex. The hex values live one level down, in
`GOAL_THEMES` (`constants/themes.ts` lines 1–10):

| category (goals.ts key) | colorTheme token | gradient (start → mid → end) | accent |
|---|---|---|---|
| `body` | `ember` | `#3D0814` → `#9D0208` → `#E85D04` | `#E85D04` |
| `mind` | `lavender` | `#2B2D42` → `#8D99AE` → `#D6BCFA` | `#D6BCFA` |
| `money` | `slate` | `#1E293B` → `#475569` → `#94A3B8` | `#94A3B8` |
| `create` | `sunset` | `#6B2737` → `#D4A373` → `#FEFAE0` | `#D4A373` |
| `connect` | `coral` | `#4A1942` → `#C84B6B` → `#FF8A80` | `#FF8A80` |
| `contribute` | `forest` | `#1B4332` → `#2D6A4F` → `#52B788` | `#52B788` |

Fallback default (unmatched category) is `'ocean'` (`lib/db/goals.ts:63`):
`#0A2342` → `#1B4965` → `#5FA8D3`, accent `#5FA8D3`.

`GOAL_THEMES` also defines `mint` (`#0B3D2E` → `#1B7A5A` → `#6FDFB8`, accent
`#6FDFB8`), which is not reachable from `lib/db/goals.ts`'s `CATEGORY_THEME`
map (see note in §2).

## 2. Export shape — is `CATEGORY_THEME` reusable by another module?

**Not exported. Private/inline to the AI-specific insert path.**

- `lib/db/goals.ts:18` — `const CATEGORY_THEME: Record<string, GoalTheme> = {...}`
  has no `export` keyword. Confirmed via `grep -n "^export"` on the file: the
  only exports are `CreateGoalWithMeasurablesResult` (interface, line 12) and
  five async functions (`createGoalWithMeasurables`, `getActivityByGoalId`,
  `completeMeasurable`, `getProjectTitle`, `getGoalProgressById`,
  `isGoalOwnedByUser`). `CATEGORY_THEME` is module-local, used only inside
  `mapAiGoalDataToDbInserts` (line 63), which is itself unexported.
- A generalized `/api/goals` insert path **cannot import** `CATEGORY_THEME`
  from `lib/db/goals.ts` today. Options: (a) export it from `goals.ts`, or
  (b) point the new path at `constants/themes.ts`'s `CATEGORY_THEME_MAP`,
  which **is** exported (line 14) — but note it uses a **different category
  vocabulary**: `fitness | health | career | education | creative | social |
  financial | personal`, mapping to `ember | mint | ocean | lavender | sunset
  | coral | slate | forest` — vs. `lib/db/goals.ts`'s
  `body | mind | money | create | connect | contribute`. These two maps are
  not drop-in compatible; reuse requires picking one category vocabulary as
  canonical or writing an adapter. (Flagging the discrepancy only — no
  changes made to `constants/themes.ts`, per out-of-scope note.)

## 3. Exact insert assignment point (today)

- `lib/db/goals.ts:63` — `const colorTheme: GoalTheme = CATEGORY_THEME[aiData.goal.category] ?? 'ocean';`
- `lib/db/goals.ts:79` — `color_theme: colorTheme,` inside the `goalInsert`
  object literal returned by `mapAiGoalDataToDbInserts` (function starts
  line 58), which is consumed by `createGoalWithMeasurables` (line 107) for
  the actual Supabase insert.

A generalized write path should replicate this same two-step shape: resolve
`category` → `colorTheme` token, then set `color_theme` at the same position
in the insert payload (sibling to `category`, `status`, `smart_data`, etc.).

## 4. `color_theme` column type/constraint

`supabase/migrations/001_core_schema_and_rls.sql:88`:

```sql
color_theme  text not null default 'ocean',
```

Confirmed: `text`, `not null`, `default 'ocean'`, **no CHECK constraint**
restricting values to the 8 `GOAL_THEMES` keys — matches the prior 21-column
inventory (free-text column, app-layer enum enforcement only via `GoalTheme`
TS type).

---

This audit wrote only to this file:
`design/design_handoff_manual_goal_creation/audit_category_theme_values.md`.
No other files were modified.
