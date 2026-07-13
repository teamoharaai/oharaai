# Audit: Manual Goal Creation UI — Field & Payload Extraction

Read-only. No implementation, no code changes. Diffs the design prototype
(`New Goal.dc.html`, `support.js`) against locked decisions in
`design/design_handoff_manual_goal_creation/DECISIONS.md` and the live write
path (`lib/ai/schemas/goal-creation.ts`, `lib/db/goals.ts`).

---

## 1. Every field the UI captures

All state lives in `New Goal.dc.html`'s inline `Component` class (`state = {...}`,
lines 287–302). **`support.js` contains none of this** — confirmed by grep: zero
hits for `target_frequency`, `payload`, `/api/goals`, `goal_id`, `artifact`, or
any `fetch(` call that isn't the DC framework's own hot-reload/asset-loading
plumbing (lines 159, 1136, 1508). `support.js` is the generic Design Component
rendering framework (event dispatch, `sc-if`/`sc-for` directives, hot reload) —
it has no goal-creation-specific logic at all. Everything reportable is in the
`.dc.html` file's own script block.

Captured fields, in form order:

| State key | UI control | Type | Required? |
|---|---|---|---|
| `titleText` | "Name the goal" input | string | Yes (non-empty, gates Create) |
| `whyText` | "Why it matters" textarea | string | No |
| `deadline` | native `<input type=date>` | string (ISO date) | Yes (validated, gates Create) |
| `selectedProjectId` | project chips | string \| null | No |
| `trackable` | rhythm toggle | bool (default from `startTrackable` prop, else `true`) | — |
| `period` | segmented control | `'week' \| 'month'` (no `'day'` option in UI) | only if `trackable` |
| `count` | +/− stepper | int, clamped 1–7 (week) / 1–30 (month) | only if `trackable` |
| `milestones` | milestone list | `{id, title, type}[]`, `type ∈ counter\|habit\|checklist` | No (empty allowed) |
| `suggestion` | AI-suggest draft | `{title, type} \| null`, ephemeral | N/A, never submitted directly |
| `showAddForm`/`draftTitle`/`draftType` | inline add-milestone form | form-local only | N/A |
| `created` | success overlay | UI-local only | N/A |

`selectedProjectId` is chosen from a **hardcoded 3-item array literal**
(`projectData` in the script, not live data) — DECISIONS.md's "State
Management" section says production should back this with `useProjectStore`;
this is an expected prototype-vs-production gap, not a schema issue.

## 2. Cadence/frequency shape vs. locked Decision 1

**No payload is ever built.** `createGoal()` (lines 470–478) does exactly this
on success:
```js
if (titleOk) this.setState({ created: true });
```
No `fetch`, no object assembly, no call to `/api/goals` or anywhere else.
Validation (title non-empty + deadline valid) runs, then it just flips
`created` to show the success overlay. This matches DECISIONS.md's own
framing of the bundle as "design references... not production code to copy
directly" (line 9) and its instruction that assembling the real
`POST /api/goals` payload is production work still to be done (line 91).

**The cadence *shape captured in state*, however, does line up structurally**
with locked Decision 1 (`{ times: int, period: 'day'|'week'|'month' }`):
- `count` (int) ↔ `times`
- `period` (`'week'|'month'`) ↔ `period`

Two gaps if this state were lifted directly into that shape:
- **Field name mismatch**: UI state key is `count`, not `times` — needs a
  rename at whatever point the payload is assembled.
- **Missing enum value**: the UI's segmented control only offers `week` and
  `month` (`['week','month'].map(...)`, line 388) — there is no `day` option
  anywhere in the UI, even though the locked type permits it. Not a bug (SMART
  cadence probably doesn't need daily-granularity UI), just noting the UI is a
  strict subset of the locked type's period enum.
- **Off state**: when `trackable` is `false`, the UI does not represent "no
  cadence" as any explicit value — there's simply no `count`/`period` shown.
  The natural mapping is `target_frequency: null` (matches DECISIONS.md line
  106, "NULL = narrative goal"), but this mapping is implicit/undocumented in
  the prototype itself, not code that exists anywhere.

## 3. AI pre-fill / suggestion-layer hooks

Yes, present, but entirely inert/local — no network call of any kind:
- `aiAssist` prop (`aiAssistEnabled`, default `true`) toggles visibility of
  the "✦ Suggest one with Ohara" button.
- `requestSuggestion()` / `regenerate()` both call a local `suggest(title, why)`
  method (lines 339–364): a keyword-matching heuristic against ~13 hardcoded
  keyword pools, returning a random `{title, type}` pair from a plain JS array
  — no `fetch`, no `callLLM`, no async, no API route reference anywhere.
- The draft renders in an editable amber "pending" card; committing
  (`useSuggestion`) pushes `{id, title: sug.title, type: sug.type}` onto
  `milestones` — **identical shape** to a manually-added milestone. There is
  no separate `is_ai_suggested`/`confirmed` flag anywhere in this client
  state; that distinction would have to be reconstructed by whichever code
  assembles the real payload (the write-path audit already confirms
  `measurables.is_ai_suggested` exists as a DB column but nothing in this UI
  tracks provenance once a suggestion is committed to the list).

**No vault-context param exists anywhere.** `suggest(title, why)`'s only
inputs are the goal's own in-form `titleText`/`whyText` — no `goalId`,
`vaultId`, prior-goal history, or any other contextual param is read, passed,
or stubbed. There is no disabled/commented-out code path referencing vaults
either. This supports leaving any vault-context param **fully absent** for
Decision 6 rather than wiring a placeholder — the design prototype gives no
signal that one was ever intended at this screen.

## 4. Field diff against locked schema

**UI fields with no corresponding column/schema slot today:**
- `whyText` ("Why it matters") — free-text narrative captured by the UI has
  no clear destination. `GoalFinalizeGoal` (`lib/ai/schemas/goal-creation.ts:25-31`)
  has `description` and a `smart.{specific,measurable,achievable,relevant,timeBound}`
  block, but none of those is "why this matters to me" in the user's own
  words — they're structured AI-authored SMART fields with different
  semantics. This is a genuine open gap: some destination (new column, or
  reuse of `description`) needs deciding before a manual-shaped validator can
  accept this field.
- Per-milestone `targetValue`, `targetUnit` — not captured by the UI's
  add-milestone form (name + type only, lines 230–235). The current validator
  (`lib/ai/schemas/goal-creation.ts:109-116`) **requires** both for `type ===
  'counter'` and requires both `null` for `type === 'checklist'`. Neither is
  reachable from the UI as built.
- Per-milestone `frequency` (`GoalMeasurableFrequency`, e.g.
  `daily|weekly|monthly|once` per `measurables.frequency`'s DB check
  constraint) — required unconditionally by the validator
  (`goal-creation.ts:99-101`) for every measurable regardless of type; the UI
  captures no frequency input at the milestone level at all (only the
  goal-level `period`/`count` rhythm, which is a different concept).
- `goal.category` — required by the validator
  (`GOAL_CATEGORIES.includes(...)`, `goal-creation.ts:71-73`); **no category
  input exists anywhere in the UI.**
- `goal.smart.*` (5 required strings) — not captured; no SMART-framework
  inputs anywhere in the form (the screen's design intentionally replaces
  the SMART-interview chat with plain fields, per DECISIONS.md's stated goal,
  but the current validator still requires all five).
- `reasoning` (required string) and `assumptions` (optional array) — AI-only
  concepts from the finalize-transcript flow; not applicable to manual entry
  and, correctly, not captured.

**Locked schema field with no corresponding UI input:** none beyond the above
— `target_frequency`'s `{times, period}` *is* represented (via `count`/`period`,
see §2), just not under matching names and not yet wired to any payload.

**`artifacts` table:** confirmed out of scope holds. Grepped both design
files for `artifact` — zero references anywhere in `New Goal.dc.html` or
`support.js`. Consistent with DECISIONS.md's own scoping (line 106) and the
prior schema audit's finding that no `artifacts` table exists in the repo at
all.

## 5. Would this validate against a manual-shaped replacement for `validateGoalFinalizeResponse`?

Since no payload is actually built in the prototype, this is necessarily
hypothetical — constructed from the state shape the UI holds, assuming the
most direct client-side assembly (flatten `titleText`→title,
`whyText`→why, etc.):

```js
{
  title: titleText,
  why: whyText,
  deadline,
  projectId: selectedProjectId,
  target_frequency: trackable ? { times: count, period } : null,
  milestones: milestones.map(m => ({ title: m.title, type: m.type })),
}
```

This would **not** validate against today's `validateGoalFinalizeResponse`,
and would still fail even a lightly-adapted version of it, for reasons beyond
simple renames:

- **Structural mismatch**: current validator expects a nested `goal: {...}`
  object (`goal.title`, `goal.deadline`); the natural UI-driven shape is flat.
  A manual-shaped validator needs new top-level field names, not just relaxed
  rules inside the existing `goal` nesting — this is a schema redesign, not a
  patch.
- **Missing required fields** that have no UI source at all: `goal.category`,
  all five `goal.smart.*` strings, `reasoning`. A manual validator must either
  make these optional/defaulted, or the UI needs new inputs — this needs a
  decision, it can't be inferred from the prototype.
- **Per-milestone gaps**: UI supplies `{title, type}`; validator needs
  `{title, type, targetValue, targetUnit, frequency}` with type-conditional
  rules. A manual-shaped validator would need to either drop these
  requirements for manually-created measurables or the milestone add-form
  needs new inputs (frequency picker, target value/unit for counters) that
  don't exist today.
- **`target_frequency` isn't part of any existing type** — `GoalFinalizeGoal`
  has no frequency field at all (confirmed in `lib/ai/schemas/goal-creation.ts:25-31`);
  this is net-new to both the validator and `mapAiGoalDataToDbInserts`
  (`lib/db/goals.ts:58-101`), consistent with the planned additive
  `goals.target_frequency` migration already called out in DECISIONS.md and
  the prior schema audit.
- **Naming to reconcile**: `count` (UI) → `times` (locked shape / eventual DB
  key); flat `title`/`deadline` (hypothetical UI payload) → `goal.title`/
  `goal.deadline` or a new flat contract, whichever a manual-shaped validator
  ultimately adopts; UI's `milestones` → DB/API's `measurables`.

**Bottom line: a genuinely new manual-shaped validator is required, not a
relaxed version of `validateGoalFinalizeResponse`** — the two payload shapes
diverge structurally (flat vs. nested `goal`), not just in which fields are
optional.

---

## Explicitly out of scope (per instructions, not evaluated)

`artifacts` table (confirmed absent from both design files, per §4), Vaults
chatbot implementation, Constellation, Habits, iOS repo, migration files,
route code changes.

---

**Output confirmation:** this audit wrote only to
`design/design_handoff_manual_goal_creation/audit_ui_field_diff.md`. No other
file was read for modification purposes or changed.
