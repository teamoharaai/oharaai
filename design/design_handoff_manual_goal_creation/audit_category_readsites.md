# Audit: `goals.category` Downstream Read-Sites

Read-only. Scope: does any code that reads `category` off a `goals` record
assume it is always non-null? No implementation, no migrations, no code
changes.

---

## 1. All read sites of `category` on a `goals` record

Full-repo grep for `.category` across `.ts`/`.tsx` (excluding tests), then
filtered to sites that read `category` off a goal (as opposed to unrelated
uses of the word — see §1b for one excluded false positive).

| # | File:Line | What it does with the value |
|---|---|---|
| 1 | `features/goals/components/GoalCard.tsx:76` | `<Badge label={goal.category} variant="category" />` — renders the category chip on the dashboard goal-list card |
| 2 | `features/goals/components/GoalDetailHeader.tsx:92` | `<Badge label={goal.category} variant="category" />` — renders the category chip on the goal detail header |
| 3 | `features/projects/components/ProjectCard.tsx:137` | `CATEGORY_THEME_MAP[goal.category] ?? goal.colorTheme` — theme-color lookup for the goal ring inside an expanded project card |
| 4 | `features/projects/components/ProjectCard.tsx:147` | `<GoalRingCard ... category={goal.category} ... />` — passes category through as the ring card's chip label |
| 5 | `features/goals/services/goal-service.ts:132` | `category: toCategory(row.category)` — DB row → domain object mapping (`mapGoal`), used by every `fetchGoals`/`fetchGoalById`/`updateGoal` call |
| 6 | `features/goals/services/goal-service.ts:311` | `if (updates.category !== undefined) patch.category = updates.category;` — conditional write in `updateGoal()`'s patch-builder (write path, not a display read, included for completeness) |
| 7 | `lib/db/goals.ts:63` | `CATEGORY_THEME[aiData.goal.category] ?? 'ocean'` — theme-color resolution at goal-creation time, from the AI finalize payload (not a DB row read — reads the pre-insert AI payload) |
| 8 | `lib/db/goals.ts:76` | `category: aiData.goal.category` — value placed into the `goals` insert payload (write path) |
| 9 | `lib/db/goals.ts:126` | `if (!aiData.goal.category?.trim())` — explicit non-null/non-empty guard before insert; returns an error result instead of inserting if missing |
| 10 | `lib/ai/schemas/goal-creation.ts:71-72` | `GOAL_CATEGORIES.includes(g.category as GoalCategory)` — validates the AI response payload has a valid category string; throws if not one of the 6 enum values (this rejects `undefined`/`null` too, since neither is in `GOAL_CATEGORIES`) |
| 11 | `lib/ai/schemas/goal-creation.ts:141` | `category: g.category as GoalCategory` — constructs the validated `GoalFinalizeGoal` object after the check above passes |
| 12 | `lib/db/embeddings.ts:94` (+ type at :21, :56) | `category: row.category` — maps a `match_goals` RPC row into `GoalMatchResult`. **Already typed `string \| null`** — see §2 |

**§1b — excluded false positive:** `features/goals/hooks/useEchoTrail.ts:19-20`
uses a parameter also named `category`, but it's `BrtCategory | null` (Bud/
Rose/Thorn journaling tag), unrelated to `goals.category`. Not a read site
for this column.

**Component prop types, for reference:**
- `Badge` (`components/ui/Badge.tsx:7`) — `label: string` (not nullable)
- `GoalRingCard` (`features/goals/components/GoalRingCard.tsx:11`) — `category: string` (not nullable)
- `Goal` domain type (`features/goals/types.ts:20`) — `category: GoalCategory` (not nullable; `GoalCategory` is the 6-value string-literal union from `lib/goals/schema.ts`)
- `DbGoal` row type (`features/goals/services/goal-service.ts:38`) — `category: string` (not nullable)

---

## 2. Would each site break, render incorrectly, or silently no-op on `category: null`?

| # | Site | Outcome if `category` were `null` | Why |
|---|---|---|---|
| 1 | `GoalCard.tsx:76` | **TypeScript compile error today** if `Goal.category` were widened to `GoalCategory \| null` (`Badge.label` requires `string`). At runtime today, `goal.category` can never be `null` because `mapGoal()` (site 5) always funnels it through `toCategory()`, which coerces any non-matching value (including `null`/`undefined`) to `'mind'` — see below. | No `null` check exists; safety comes entirely from the upstream mapper, not this component. |
| 2 | `GoalDetailHeader.tsx:92` | Same as #1 — same `Badge` prop, same upstream mapper dependency. | Same reasoning. |
| 3 | `ProjectCard.tsx:137` | **No crash either way.** `CATEGORY_THEME_MAP` (`constants/themes.ts:14-23`) is a plain object keyed by `fitness/health/career/education/creative/social/financial/personal` — **none of which match the current 6 `GOAL_CATEGORIES` values** (`body/mind/money/create/connect/contribute`). So this lookup already misses for every valid category today and always falls through to `goal.colorTheme` via `??`. A `null` category would miss the same way, with the same fallback. This site is effectively dead/stale regardless of nullability — worth flagging separately from the null question. | Object index with `??` fallback already tolerant of misses, including `null`/`undefined` keys. |
| 4 | `ProjectCard.tsx:147` | Same compile-time exposure as #1/#2 — `GoalRingCard`'s `category` prop is `string`, not nullable. At runtime, would render an empty chip label if `null` slipped through untyped (e.g., via `as any`), since `Badge` inside `GoalRingCard` just interpolates the string. | No null-guard in `GoalRingCard` or its internal `Badge` usage. |
| 5 | `goal-service.ts:132` (`toCategory`) | **Does not break.** `toCategory(raw: string): GoalCategory` (`goal-service.ts:73-75`) does `GOAL_CATEGORIES.includes(raw as GoalCategory) ? raw : 'mind'`. `Array.includes(null)` simply returns `false`, so `null`/`undefined` silently coerce to the fallback `'mind'`. This is the one site in the read path that already defensively handles a bad/missing value — but note this is a **silent semantic no-op**, not a null-aware code path: a goal with a genuinely-null category would display as `'mind'` with no indication it was defaulted. TypeScript would flag the call site if `row.category` were retyped `string \| null` (its param is `raw: string`), but would not flag anything if the DB column is simply left `text not null` and the app never produces nulls. | `Array.prototype.includes` treats `null` as "not found," not as an exception. |
| 6 | `goal-service.ts:311` (`updateGoal`) | Write path, not a read. `updates.category` is typed `GoalCategory` on `Partial<Goal>`, so `undefined` (not `null`) is the only "absent" state the guard (`!== undefined`) checks for; passing `null` explicitly would flow into `patch.category = null` and fail the DB `NOT NULL` constraint at request time (a Postgres error, surfaced via the existing `error \|\| !data` check → returns `null`). | Included for completeness per the "grouping/filtering/display" scope; not a display read. |
| 7 | `lib/db/goals.ts:63` (`CATEGORY_THEME`) | `CATEGORY_THEME[aiData.goal.category] ?? 'ocean'` — object index with `??` fallback, same pattern as #3. A `null`/unmatched category silently falls back to `'ocean'`. No crash. | Same tolerant-lookup pattern. |
| 8 | `lib/db/goals.ts:76` (insert payload) | Write path. If `null` reached this line, the subsequent DB insert would fail the `NOT NULL` constraint (confirmed in `audit_db_constraints.md`) and surface as a Postgres error via the existing `goalError` check — not a silent failure, but also not caught earlier by any TS type (this function's input type, `GoalFinalizeGoal.category`, is `GoalCategory`, non-nullable). | Relies on constraint #9 running first (see next row) and, ultimately, the DB constraint as a backstop. |
| 9 | `lib/db/goals.ts:126` (`if (!aiData.goal.category?.trim())`) | **This is the one genuine, explicit null/empty guard in the entire read/write chain.** Catches `null`, `undefined`, and `''`/whitespace-only before ever building the insert payload, returning a structured `{ goalId: null, error, warning: null }` instead of throwing or inserting. | Explicit optional-chaining + truthiness check, written defensively despite `category` being typed non-nullable — the one site that doesn't assume the type guarantee holds. |
| 10 | `goal-creation.ts:71-72` (`validateGoalFinalizeResponse`) | **Explicit guard, throws.** `GOAL_CATEGORIES.includes(g.category as GoalCategory)` is `false` for `null`/`undefined`/anything outside the 6-value enum, so the function throws `"goal.category must be one of: ..."` before any downstream code sees the value. This is the earliest gate in the AI-generated-goal path — nothing past this point in that specific pipeline can ever see a null category. | `Array.includes` on an `unknown`/absent value is intentionally used as a validation gate here, not silently tolerated. |
| 11 | `goal-creation.ts:141` | Unreachable with `null` — only executes after #10's guard has already passed. | Downstream of an explicit throw. |
| 12 | `lib/db/embeddings.ts:94` (`GoalMatchResult.category`) | **Already null-safe by type**, and moot in practice: `findSimilarGoals()` (the only function that produces a `GoalMatchResult`) has **zero callers anywhere in the repo** (confirmed via repo-wide grep for `findSimilarGoals` / `GoalMatchResult` outside `embeddings.ts` itself). Dead code path today — not wired into any UI, filter, or grouping logic. | Type already accounts for null; no consumer exists to break regardless. |

### Summary judgment

- **Two sites would break at compile time** if `Goal.category` (the domain
  type) were changed to nullable, because they feed a non-nullable `string`
  prop with no guard: `GoalCard.tsx:76` and `GoalDetailHeader.tsx:92`
  (`Badge.label`), and `ProjectCard.tsx:147` (`GoalRingCard.category`) —
  three call sites total, two components.
- **Two sites already silently coerce** an unmatched/missing category to a
  hardcoded fallback rather than crashing: `toCategory()` in
  `goal-service.ts` (→ `'mind'`) and the `CATEGORY_THEME` / `CATEGORY_THEME_MAP`
  object lookups in `lib/db/goals.ts` and `ProjectCard.tsx` (→ `'ocean'` /
  `goal.colorTheme`). None of these have a `default` branch that surfaces
  "unknown category" to the user — the fallback is indistinguishable from a
  genuine `'mind'` or default-theme goal.
- **`ProjectCard.tsx`'s `CATEGORY_THEME_MAP` lookup is stale independent of
  this question** — its keys don't match any current `GOAL_CATEGORIES`
  value, so it already always falls through today. Flagging as a
  pre-existing inconsistency noticed during this audit, not a
  null-handling gap.
- **Only one site in the whole chain treats a missing category as an
  explicit, handled case with a clear message**: the guard at
  `lib/db/goals.ts:126`, in the AI goal-creation persistence path.
- No read site anywhere (component, service, or query) has a `switch`
  statement or explicit `default`/`unknown` branch for category — the
  6-value enum is always treated as closed, and the two coercion sites
  above are the only fallback behavior that exists.

---

## 3. Existing goal rows — do any exist, and is `category` set?

**Queried the live Supabase database directly** (`goals` table, via the
project's own REST endpoint, service-role key from `.env.local`,
`select=id,category,created_at`, read-only `GET`).

**Result: 4 rows exist** (contradicts the "pre-pilot, no data" framing
elsewhere in this design-handoff bundle — e.g. `DECISIONS.md`'s migration
plan assumes "no backfill" needed). All 4 have `category` **set**, all to
valid current enum values:

| `id` | `category` | `created_at` |
|---|---|---|
| `d466a0e3-…` | `body` | 2026-07-02 |
| `ae716a0f-…` | `mind` | 2026-06-26 |
| `e99c57f6-…` | `body` | 2026-07-11 |
| `90879b60-…` | `body` | 2026-07-11 |

No row has a `null` or empty-string `category`. This is consistent with the
DB-level `NOT NULL` constraint (confirmed in `audit_db_constraints.md`,
§1) — the constraint has no exceptions in the live table, and nothing in
the current insert path (`createGoalWithMeasurables`, gated by the
`lib/db/goals.ts:126` guard) can produce a null value, so 100% of existing
rows populate the field.

**Does any UI depend on `category` being present for these specific rows?**
Yes, functionally, for all 4: opening any of them in the goal list
(`GoalCard`) or detail view (`GoalDetailHeader`) renders the category badge
using the row's real value (`body`/`mind`), and the project-card ring view
would do the same for any of the 4 that have a `project_id` set. None of
this is contingent on the rows being pre-pilot placeholders — the badges
render from real category values today, same as they would for any future
row.

---

## Explicitly out of scope (not evaluated)

Migration authoring, UI changes, `target_frequency`, the `artifacts` table,
`/api/goals/create` removal.

---

**Output confirmation:** this audit wrote only to
`design/design_handoff_manual_goal_creation/audit_category_readsites.md`.
No other file was read for modification purposes or changed. The live
database query in §3 was read-only (`GET`, no insert/update/delete) and
used credentials already present in the repo's own `.env.local`.
