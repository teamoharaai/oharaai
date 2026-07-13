# Audit: Manual Goal Creation — Schema & Route Diff

**Scope:** Read-only diff of the manual-goal-creation design handoff against
the live Supabase schema and existing goal-creation code paths. No
implementation, no migrations, no code changes.

**Note on source doc:** `design/design_handoff_manual_goal_creation/DECISIONS.md`
does not exist in the repo. The "locked decisions" content (schema section,
migration plan, screen spec) lives instead in
`design/design_handoff_manual_goal_creation/README.md`. This audit diffs that
file. Flagging the missing filename in case it's expected to exist elsewhere
(e.g. not yet committed) — worth confirming with whoever wrote the handoff.

---

## 1. Cadence/frequency column on `goals`

**No column exists on `goals` today matching cadence/frequency.** Checked the
live `goals` table definition (`supabase/migrations/001_core_schema_and_rls.sql:76-103`):
`id, user_id, title, category, status, smart_data, is_private, community_id,
created_at, updated_at, description, color_theme, deadline, progress,
ai_generated, project_id, visibility, space_id, embedding, embedding_text,
embedding_model`. No `frequency`/`cadence`/`times_per_week`/`target_frequency`.

A **different** `frequency` column exists, but on `measurables`, not `goals`:
`measurables.frequency text check (frequency in ('daily','weekly','monthly','once'))`
(`001_core_schema_and_rls.sql:171`). This is a single-value enum tied to an
individual milestone, not the goal-level `{times, period}` structure the
handoff proposes. No naming collision (different column name, different
table), but worth being explicit that these are two distinct cadence
concepts that will coexist: milestone-level `measurables.frequency` (enum)
and the proposed goal-level `goals.target_frequency` (jsonb `{times,
period}`). The handoff's README already scopes this correctly ("Reuse
existing measurables for milestones — no new table for this screen"), so no
conflict, just noting for implementers so the two aren't confused.

**Conclusion:** `goals.target_frequency jsonb NULL` is a clean additive
column with no collision.

## 2. `artifacts` table/column

**No `artifacts` table or column exists anywhere in the schema or `types/`.**
Grepped all of `supabase/` and `types/` — zero hits. The handoff's own README
already scopes the broader spec's `artifacts` table as out-of-scope for this
screen ("The broader spec's `artifacts` table is out of scope here"), which
matches reality: nothing to collide with today.

## 3. `echo_entry_links.container_type` post-Echo-Folders

Confirmed unchanged since migration 012 through the current tip (018).

- **012_echo_entry_links.sql** (`supabase/migrations/012_echo_entry_links.sql:28-32`):
  renames `echo_goal_links` → `echo_entry_links`, adds `container_type text
  not null check (container_type in ('goal', 'folder'))`.
- **013_echo_folders.sql** adds the `echo_folders` table and the FK on
  `folder_id` (`ON DELETE RESTRICT`, deliberate per its header comment) but
  does **not** touch `container_type` or its check constraint.
- 014–018 (folder RPC lockdown, delete functions, one-confirmed-link
  constraint, eager provisioning, system-default link source) — none alter
  `container_type`.

**Current allowed values: `'goal' | 'folder'`, unchanged.** The manual
goal-creation work's use of `container_type = 'goal'` linkage (implicit via
existing goal-linking patterns) remains valid with no migration needed.

## 4. Media/image attachment on `echo_entries`

`echo_entries` has a single `media_url text` column (`supabase/migrations/002_echo.sql:48`),
not a separate media table. **No support for more than one image per
entry today.** No junction/array table for attachments exists anywhere in
`supabase/migrations/`. This is out of the handoff's stated scope (goal
creation, not Echo entry attachments) — flagging only because the audit
checklist asked; it does not block anything in this handoff.

## 5. pgvector/HNSW + embedding column declaration

- Extension: `create extension if not exists vector;` in
  `supabase/migrations/001_core_schema_and_rls.sql:38`. Confirmed enabled.
- **Declaration is a bare `vector` type with no dimension modifier** at the
  SQL level — on `goals.embedding`, `echo_entries.embedding`, and
  `vault_items.embedding` alike (`001_core_schema_and_rls.sql:95`,
  `002_echo.sql:59`, `004_vaults_and_embeddings.sql:58`). There is no
  `vector(1024)` constraint in the schema itself.
- The 1024-dimension and model (`voyage-4-lite`) are enforced **application-side**
  only, via `EMBEDDING_DIMENSIONS = 1024` and `EMBEDDING_MODEL = 'voyage-4-lite'`
  in `lib/ai/constants.ts:1-2`, consumed by `lib/ai/embeddings.ts`.
- HNSW indexes exist for all three tables with identical parameters
  (`m = 16, ef_construction = 64`, cosine ops) — see
  `004_vaults_and_embeddings.sql:95-100`.

**Conclusion:** if a future `artifacts.embedding` column is added (explicitly
out of scope for this handoff), it should match this repo's actual pattern —
bare `vector` column + app-side dimension/model enforcement + a matching HNSW
index — not a SQL-level `vector(1024)` type, since that's not how any
existing embedding column here is declared. Noting this only so a future
implementer doesn't introduce an inconsistent pattern; no action needed now.

## 6. Current goal-creation UI/API — AI-write-primary vs. form-based

**Today's flow is fully AI-write-primary, end to end.** The "reversal to
primitive-first" in the handoff's README is a full rewrite of both the
screen and the persistence entry point, not a UI-only change.

- **`app/goals/create.tsx`** (655 lines): a chat interface. State is
  `messages: ConversationMessage[]`, rendered as a scrolling conversation
  (`TextInput` + send, no structured form fields for title/category/deadline
  as user-editable inputs — those are extracted by the AI from the
  conversation). A `deadlineInput` manual override exists but is described in
  its own comment as optional: empty means "let the AI infer it from
  conversation" (`app/goals/create.tsx:46-47`).
- **`app/api/goals/create+api.ts`** (792 lines): the AI conversation +
  finalization endpoint. Stage 1 (`callLLM({ pipeline: 'goalCreation', ... })`)
  drives the back-and-forth chat. Stage 2 (`finalizeGoalFromTranscript`,
  triggered by a `[[GOAL_READY]]` sentinel from the assistant or an explicit
  `finalize` flag) calls `callLLM({ pipeline: 'goalFinalize', ... })` to turn
  the whole transcript into a structured `GoalFinalizeResponse` (goal +
  measurables) via `parseGoalFinalizeResponse`. **This route never writes to
  the database** — it only returns AI-generated `goalData` to the client.
- **`app/api/goals/index+api.ts`** (`POST`, 69 lines) is the actual
  persistence endpoint the client calls next. It does `validateGoalFinalizeResponse(payload.aiData)`
  (schema validation only, no model call) then
  `createGoalWithMeasurables(auth.userId, aiData, payload.options, authedDb)`.
  So today's flow is a genuine two-step split: `/api/goals/create` produces
  AI-authored goal data, `/api/goals` persists whatever shape it's handed —
  it does not itself call AI, it just trusts the caller's payload matches
  `GoalFinalizeResponse`.
- **The DB write function itself is AI-shaped, not just the routes.**
  `lib/db/goals.ts:107` — `createGoalWithMeasurables(userId, aiData:
  GoalFinalizeResponse, ...)` takes `GoalFinalizeResponse` as its sole input
  type. Its internal mapper (`mapAiGoalDataToDbInserts`, `lib/db/goals.ts:58-101`)
  unconditionally sets `ai_generated: true` on the goal insert and
  `is_ai_suggested: true` on every measurable insert (`lib/db/goals.ts:82,93`).
  There is no existing "manual, non-AI" code path through this function —
  building the new form means either adding a new insert function/branch that
  sets these flags `false`, or extending `createGoalWithMeasurables` to accept
  a manually-authored shape as an alternative to `GoalFinalizeResponse`.
  Since `index+api.ts` already does its own validation and calls this
  function directly with no AI involvement, it's the natural extension point
  for the new form's write path — the new screen can likely call the same
  `POST /api/goals` endpoint with a manually-assembled payload shaped like
  `GoalFinalizeResponse` (all `ai_generated`/`is_ai_suggested` forced false),
  bypassing `/api/goals/create` entirely rather than needing a third route.
  `createGoalWithMeasurables` does not touch `echo_entry_links` or any
  `milestones` table — the design doc's "milestones" are the existing
  `measurables` rows, as it already states.

**Size of the reversal:** substantial. Not just replacing the chat UI with a
form — the persistence layer's only entry point today is typed around and
defaults to AI-authored data (`ai_generated`/`is_ai_suggested` both hardcoded
true). The new manual form will need its own insert path (or a modified
`createGoalWithMeasurables` accepting a non-AI shape) so manually-created
goals/milestones are correctly flagged `ai_generated: false` /
`is_ai_suggested: false` in the DB, matching the handoff's "AI never writes,
only suggests" principle. Confirming milestones added via the design's "✦
Suggest one with Ohara" flow should still be flagged `is_ai_suggested: true`
until the user commits them — the existing column already supports that
per-milestone distinction, it's just not wired to anything but the
all-AI path today.

## 7. Dual-write / legacy `goal_id` patterns on `echo_entries`

No new dual-write pattern surfaced beyond the already-known, already-documented
debt — and it's more thoroughly retired than the checklist assumed. A
repo-wide check of every write path found **zero live writes** to
`echo_entries.goal_id`:

- `features/echo/services/echo-service.ts` `createEntry()` explicitly omits
  `goal_id` from the `echo_entries` insert, with an inline comment: *"goal_id
  is intentionally omitted (defaults to null) — container assignment now
  goes exclusively through echo_entry_links, below. The column itself is
  preserved... only new-insert writes stop."* Both its manual-link path and
  its separate `ai_auto` keyword-matching path write only to
  `echo_entry_links`.
- `lib/db/echo-entry-links.ts` `createLink()` likewise writes only to
  `echo_entry_links`.
- Confirmed again via `lib/db/goals.ts:442-445` (activity-feed read):

> "Echo-goal links — reflections linked via echo_entry_links (many-to-many
> bridge), now the sole source for goal-linked reflections: createEntry() no
> longer writes echo_entries.goal_id on new inserts (see echo-service.ts), so
> this table is canonical rather than a supplement to a legacy join."

This matches `supabase/CLAUDE.md`'s existing note that `echo_entries.goal_id`
is preserved for backward compatibility on old rows only, with
`echo_entry_links` (`container_type = 'goal'`) canonical going forward. No
new write-path collision found that would interact with the manual
goal-creation work.

---

## Additional finding (not in the original checklist, surfaced incidentally)

**Migration numbering in the handoff's README is stale and would collide if
run as literally described.** The README's schema section
(`design/design_handoff_manual_goal_creation/README.md:22,105-106`) labels
the additive `goals.target_frequency` migration as **"Migration 012"** — but
`012` is already taken (`012_echo_entry_links.sql`, applied 2026-07-08). The
live migrations directory currently runs through `018` (last:
`018_echo_entry_links_system_default_source.sql`). The **next available
migration number is 019**, not 012.

Separately, `supabase/CLAUDE.md` itself (the nested file governing this
directory) says "Next new migration: 013" — also stale, since 013–018 exist.
Both the handoff doc and the nested CLAUDE.md need their migration-number
references corrected before anyone writes the actual migration file; this
doesn't block the design work but will misdirect whoever names the file if
followed literally.

---

## Explicitly out of scope (per instructions, not evaluated)

Vaults chatbot, RAG/suggestion-layer wiring, Constellation, Habits, iOS repo,
`ai_suggested` link-source decision, embedding-into-BRT work. Nothing found
in this audit structurally blocks any of these later.

---

**Output confirmation:** this audit wrote only to
`design/design_handoff_manual_goal_creation/audit_schema_route_diff.md`. No
other file was modified.
