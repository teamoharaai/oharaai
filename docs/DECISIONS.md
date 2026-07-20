# Decision Log — TODO
# Decision Log — Ohara

> Dated record of architectural and product decisions. Append only — never edit past entries.

---

### 2026-03-29 — AI Layer Simplification

**Decision:** Phase 1 ships with one Guide voice, not three personalities.
**Reason:** Three-personality system is highest-complexity, highest-risk, and not core to the loop. One warm, flexible voice achieves the same goal.
**Impact:** Bud/Rose/Thorn classification still happens silently in structured output. Guide field removed from response schema. Can add personalities in Phase 2 without architectural changes.

### 2026-03-29 — Journal AI is Opt-In

**Decision:** AI insight on journal entries is opt-in, not default.
**Reason:** Journaling is the user's space. AI should enhance, not intrude. Also reduces cost — private entries are zero AI cost.
**Three paths:** (A) Private journal — no AI. (B) Request insight on specific entry. (C) Always-on mode via user setting.
**Impact:** `echo_entries.ai_opted_in` boolean controls flow. Pipeline trigger is decoupled from pipeline logic.

### 2026-03-29 — Unified Echo Table with Goal FK

**Decision:** Goal-specific journal entries and general journal entries live in the same `echo_entries` table. `goal_id` is a nullable FK.
**Reason:** Same AI pipeline, same components, same sharing model. Avoids duplicate tables. Goal activity feed pulls from echo where `goal_id` matches.
**Impact:** Media attached to goal-specific entries can surface in goal detail UI.

### 2026-03-29 — Measurable Types: Counter, Habit, Checklist

**Decision:** Three measurable types with a single `type` discriminator column.
**Reason:** Covers all observed use cases (cumulative tracking, daily habits, one-time tasks). UI renders differently per type but data shape is the same.
**Impact:** LLM suggests measurables during goal creation; users can edit/add/remove. `is_ai_suggested` flag tracks origin.

### 2026-03-29 — Goal Color Themes Auto-Assigned by Category

**Decision:** Goals get a color theme auto-assigned based on category from `CATEGORY_THEME_MAP`.
**Reason:** Less user friction than a color picker. Consistent visual language. Themes carry into Phase 2 feed.
**Impact:** 8 themes defined in `constants/themes.ts`. Category → theme mapping is deterministic.

### 2026-03-29 — Feature-Slice Folder Architecture

**Decision:** Migrated from flat technical-role structure to hybrid feature-slice.
**Reason:** Each feature owns its components, hooks, services, store, and types. Reduces context-switching. Scales to Phase 2 by adding new feature folders without touching existing ones.
**Impact:** `features/auth/`, `features/goals/`, `features/echo/`, `features/profile/`, `features/dashboard/`. Shared infra stays in `lib/`.

### 2026-03-29 — AI Response Schema as Strict Contract

**Decision:** All AI pipelines must validate output against Zod schemas defined in `docs/AI_RESPONSE_SCHEMA.md`.
**Reason:** LLMs produce non-deterministic output. Without validation, malformed responses can corrupt data, crash UI, or leak internal taxonomy.
**Impact:** `lib/ai/schemas/` holds Zod schemas. Pipelines validate before returning. Failed validation → retry once → graceful fallback. Never partial-save.

### 2026-03-29 — Async Queue for AI Processing

**Decision:** AI insight requests go through an async queue, not synchronous Edge Function calls.
**Reason:** Synchronous calls block under concurrent load. Async queue with Realtime polling handles 50+ concurrent users. "Guide is thinking" UX feels natural for opt-in insight.
**Impact:** `lib/ai/queue.ts` handles enqueue/dequeue. Client polls or subscribes via Supabase Realtime.

### 2026-03-29 — Desktop-First, Mobile-Ready Layout

**Decision:** Dashboard is responsive grid (4→2→1 columns). Goal detail is two-column on desktop, single-column stack on mobile.
**Reason:** Deploying to Vercel first, desktop is primary surface. Flexbox-based layout translates to native ScrollView later.
**Impact:** No CSS Grid for component internals. Grid only acceptable for dashboard card layout on web.

### 2026-04-05 — action_logs.due_date is client-generated

**Decision:** `due_date` in `action_logs` is set by the client (`new Date().toISOString().split('T')[0]`). Timezone offset is a known issue — a user in UTC-8 at 11pm will get tomorrow's date. Acceptable for pilot. Revisit before action completion UI ships.

### 2026-04-05 — Goals use explicit visibility states

**Decision:** Goal sharing is stored as a `visibility` enum-like field with `private`, `circle`, and `public`, not a boolean.
**Reason:** Visibility enum prevents consent violation when Phase 2 expands audience. Users who chose 'circle' (connections only) should never be silently upgraded to 'public' (all authenticated). A boolean sharing flag is insufficient because it collapses limited-consent sharing and broad visibility into the same state.
**Impact:** `circle` remains distinct from `public` in both schema and application types. Phase 1 may preserve conservative access behavior until connection-aware visibility is fully implemented, so `circle` is stored now without being treated as public by current policies.

## Thorn -> Goal Suggestion Loop (Phase 2)

When a user's Echo reflection contains a thorn element, Ohara will surface a
prompt suggesting the creation of a new goal linked back to the original goal.
This creates continuity between reflection and goal creation, compounding growth
over time.

Implementation notes:
- Triggered server-side after BRT parsing detects thorn signal
- Suggested goal is pre-seeded with thorn context but user-initiated
- Link between thorn reflection and derived goal stored via goal metadata
- Phase 2 only - requires Discovery feature and pattern analysis layer

## April 5th, 2026
Intelligence zone is gated behind both FEATURES.INTELLIGENCE_ENABLED and a non-empty character_profile. Currently dormant — will activate automatically once the summarizer pipeline is enabled and has run at least once per user.

Rate limit is 30 AI calls/day/user, enforced atomically at callLLM via consume_daily_ai_quota(). UTC date bucket. Retries count against quota. Limit was chosen for Phase 1 pilot; revisit before broader rollout.
The Echo failure shape is worth a comment in the code:

ok: true with { reflection: null, summarized: false } is intentional — entry is persisted before the AI call, so generation failure is not an application error.

Pipeline observability logs emitted via console.log (structured JSON) at 
lib/ai/client.ts chokepoint. Captured by Vercel. No DB table — revisit 
in Phase 2 when usage patterns are known.

## April 6th,2026
## BRTClassification vs EchoBrt — consolidation deferred

**Date:** April 2026
**Status:** Deferred — cleanup needed

Two BRT-related types currently coexist:
- `BRTClassification = 'bud' | 'rose' | 'thorn'` in `types/global.ts`
- `EchoBrt` (definition in `features/echo/types.ts`, used in `types/activity.ts` and `lib/db/goals.ts`)

`EchoBrt` is already behaving as a domain-wide type but lives in a feature folder.
`BRTClassification` in `global.ts` is a separate definition that may or may not be equivalent.

**Action required:** Audit whether these two types are identical or diverging.
If identical, consolidate to one definition in `types/global.ts`, deprecate `EchoBrt`
from the feature folder, and update all import sites. If diverging, document the
distinction explicitly.

**Affected files:** `features/echo/types.ts`, `types/global.ts`, `types/activity.ts`,
`lib/db/goals.ts`, `lib/activity/mappers.ts`

Renamed spaces.user_id → owner_id in migration 022 for semantic clarity; ownerId in types/space.ts now maps directly without aliasing"

## 2026-04-08

### H2 — Echo Prompt File Consolidation [DEFERRED]

**Status:** Deferred to dedicated session before Phase 2 echo work begins.

**Context:**
Two separate prompt files serve the echo pipeline:
- `lib/ai/echo/prompts.ts` → `ECHO_INFERENCE_PROMPT` (interprets user
  input: tone, themes, goal relevance)
- `lib/ai/prompts/echo-reflection.ts` → `ECHO_REFLECTION_SYSTEM_PROMPT`
  and `buildEchoReflectionPrompt()` (generates AI response back to user)

Both are imported by the same API routes (`reconcile`, `reflect`).
They are not duplicates — they serve different stages of the pipeline.
The problem is organizational: they live in different directories.

**Decision:**
Both files should eventually live in `lib/ai/echo/` as the
feature-scoped canonical location. Consolidation deferred because
it requires modifying live API routes and falls outside the scope
of a cleanup session.

**Action required before Phase 2 echo work:**
Run a dedicated single-concern prompt to move
`lib/ai/prompts/echo-reflection.ts` into `lib/ai/echo/` and update
all importers.

---

### H3 — mode Column (goals table) [PARTIALLY RESOLVED]

**Status:** Insert removed. Column drop deferred.

**Context:**
The `mode` column (`exploration | commitment`) was added in migration
`001_initial_schema.sql` and was never dropped. The concept was removed
from the product. The canonical `Goal` TS type has no `mode` field.
`lib/db/goals.ts` was silently inserting `mode: 'commitment' as const`
on every goal creation with no consumer reading it.

**Decision:**
- Removed `mode: 'commitment'` from the goal insert in `lib/db/goals.ts`.
  The column remains in the DB. Insert succeeds without it (column is
  nullable or has a default).
- Formally dropping the column requires a new migration. Scheduled as
  a CTO task — coordinate before Phase 2 schema work begins.

**Action required:**
CTO to create migration `022_drop_goals_mode_column.sql` when
convenient. Non-blocking for Phase 2.

---

### H4 — useEchoTrail Direct DB Import [DEFERRED]

**Status:** Deferred to dedicated session. Documented as known
boundary violation.

**Context:**
`features/goals/hooks/useEchoTrail.ts` imports directly from
`lib/db/echo-goal-links`, bypassing the API layer. All other
feature hooks go through API routes. This means Echo Trail does
not benefit from API-layer auth scoping, rate limiting, or
structured logging.

**Decision:**
Not migrated during cleanup to avoid touching the live echo pipeline
outside its dedicated session. The direct DB import is a known
approved exception for Phase 1 only.

**Action required before Phase 2:**
Run a dedicated prompt to create `app/api/echo/trail+api.ts` and
migrate `useEchoTrail.ts` to fetch through it. This must be
completed before any Phase 2 echo feature work begins to ensure
the API layer is consistent.

**Owner:** Ariel (AI layer) + CTO (API route + DB layer).

## 2026-04-08: profile_embeddings junction table deferred to Phase 2.
   Only powers "smarter candidate extraction context" retrieval use case,
   which is Qdrant-era. Blocks 1–4 deliver complete embedding pipeline
   without it.


 Verified — bug fixed and confirmed live

  - POST /api/goals → 201, goalId: 0ce941b6-4230-4aff-8b3f-690a3193dbe7
  - DB row confirms mode: 'commitment' persisted correctly, no NOT-NULL/CHECK violation
  - Same code path serves the 3-arg production call from create.tsx (createGoalWithMeasurables
  → mapAiGoalDataToDbInserts), so that path is fixed too
  - npx tsc --noEmit clean
  - Cleaned up: killed the temporary Expo dev server I started on :8089, removed scratch test
  scripts

  Note: port 3002 (already running) is an unrelated Next.js/Clerk project, not Ohara — don't
  target it for future Ohara API tests; use expo start --web on its own port.

  One change worth logging in DECISIONS.md per your earlier ask: the mode write was previously
  deleted in an unreviewed 2026-04-07 cleanup pass (H3 in CHANGELOGCODEX.md) — that's the
  actual root cause of the prod outage. Restoring it here is the fix; the open question for CTO
  is whether mode stays a fixed 'commitment' default or gets real Phase 2 wiring.

**Resolution (2026-06-21):** `exploration` mode was originally scoped for a bored-user
recommendation feature (Ohara suggesting new hobbies/passions to explore). That concept is
superseded by Echo + Vaults, which can make better-grounded recommendations from real
behavioral signal than a standalone exploration mode ever could. `exploration` is confirmed
dead — not deferred, not planned. `mode: 'commitment'` is correct as the permanent value for
all goals created via createGoalWithMeasurables, not just an interim placeholder.

**Follow-up:** Simplify the goals.mode CHECK constraint to drop 'exploration' (or drop the
mode column entirely if no other code path ever reads/writes it) via a new migration, before
the iOS schema gets locked in. Don't carry a dead enum value into the SwiftUI rewrite.


## 2026-06-25
Entry — Daily-only due-today for v1:

Block 4.1 ("measurable due today") scoped to frequency = 'daily' only. Weekly/monthly excluded until an anchor-day column and logic are designed. No due_date/next_due_at column added at this time — avoids guessing at undefined behavior. Revisit when weekly/monthly support is prioritized.

Entry — Flexible completion-logging confirmed sufficient (4.2):

Existing measurables pattern (type + nullable target_value/target_unit + measurable_logs.note) already supports type-variable completion logging without new tables. Example: a numeric measurable ("Run 5K," type counter, target_unit: "km") logs a value; a qualitative measurable ("Try a new recipe," type checklist, target_value/target_unit null) logs value: 1 as a done-toggle with the substance carried entirely in note ("felt confident, would repeat"). One flexible shape, branching only at the UI layer on type to decide numeric input vs. toggle vs. note-only. No schema addition needed for 4.2.

Entry — Scope amendment, profile-creation fix pulled into Block 4:

The dedicated handle_new_user() fix session is still owed for a full audit of the broader signup flow, but the minimal fix (profile row + timezone capture) is pulled into Block 4 because due-today logic has a hard dependency on it. Scope limited to: trigger creation + timezone column. No other auth/signup behavior touched.

## 2026-06-26 — ai_auto echo_goal_link Activity suppression: DROPPED

Work to suppress unconfirmed `ai_auto` echo_goal_links from the Activity feed is dropped; the ai_auto keyword-heuristic linking mechanism is superseded by a completion-triggered reflection flow (checkmark on a measurable/task prompts an optional reflection), and UI/UX for that flow is undecided — this is a separate future session.

## 2026-06-26
Side effect of enabling INTELLIGENCE_ENABLED: also activates the dashboard Intelligence Zone (/api/intelligence), a separate AI-calling feature gated by the same flag. Both Echo AI insight and Intelligence Zone are now live with no paywall. Accepted as expected — re-gating both behind a real entitlement system is deferred to the future business-model session.

## 2026-07-03 — 20px-Inter-Bold Typography variant: CLOSED, no variant needed

Deleted `components/layout/Header.tsx` as dead code (zero callers repo-wide; Typography Phase 3 Group A cleanup). This removed one of the three sites in the "20px Inter-Bold" cluster flagged during the Phase 3 Group 2 audit — the other two are `+not-found.tsx` and `modal.tsx`. With Header.tsx gone, the cluster drops to 2 sites, below the 3+ recurrence threshold required to justify a new Typography variant. Status is closed as no-variant-needed, not deferred; do not revisit unless a third real site appears.

## 2026-07-08 — handle_new_user() fix session: CLOSED as verification-only

The "dedicated handle_new_user() fix session" owed since the 2026-06-25 entry above is closed. No code, trigger, or migration changes were made this session. Migration 008 (2026-06-25/26) already created `handle_new_user()` + the `on_auth_user_created` trigger, and `CHANGELOGCODEX.md` (2026-07-01 session, migration 011) separately notes the trigger was fixed manually via SQL Editor prior to that session "per A1 audit." A prior read-only audit this session (static file review only — no live DB credentials available, no query run) flagged that these two accounts don't fully reconcile: it's not independently confirmed from this session that the live function body matches `008_profiles_timezone_and_user_trigger.sql` verbatim.

A Session 0 Closeout report supplied to this session asserted, as already-verified ground truth, that: the live `handle_new_user()` body matches migration 008 exactly, both `on_auth_user_created` and `on_profile_created_create_space` are attached and enabled, and existing `profiles` rows have `created_at` and a provisioned personal space populated for real signups. That report's underlying query output was not shown to this session, so this closure is recorded as **reported verified, not independently re-confirmed here**. If this becomes load-bearing again, re-run `pg_get_functiondef('public.handle_new_user'::regproc)` and a trigger-catalog check against live Supabase before relying on it further.

# Decisions Log

## Session 1 — Echo Folders Redesign, Data Model Audit
- **Decision: Option A over Option B.** Generalize the existing `echo_goal_links` 
  table into `echo_entry_links` (container_type discriminator, nullable goal_id/
  folder_id) rather than adding a separate `echo_folder_links` table. Rationale: 
  no live production data exists (pre-pilot), so the live-data migration risk that 
  would normally favor Option B doesn't apply. Option A is the cleaner long-term 
  shape.
- **Finding: composite unique constraints don't dedup nullable columns.** 
  NULL ≠ NULL in SQL, so a single composite unique constraint across goal_id/
  folder_id silently fails to prevent duplicate links. Resolved with two separate 
  plain unique constraints, one per container column.

## Session 2 — echo_folders Schema
- **Decision: folder_id FK is ON DELETE RESTRICT, not CASCADE.** Deliberate — 
  folder deletion requires an explicit user choice (cascade contents vs. reassign 
  to General) that wasn't built yet at the time. RESTRICT makes deletion impossible 
  at the DB level until that logic exists.
- **Decision: General folder resolution via `get_or_create_general_folder`, 
  SECURITY DEFINER, called service-role-only.** Written in plpgsql so it can later 
  be called directly from a repaired `handle_new_user()` trigger with zero call-site 
  changes.
- **Finding/Fix: Postgres grants EXECUTE to PUBLIC by default**, and Supabase/
  PostgREST exposes public-schema functions as client-callable RPCs unless 
  explicitly revoked. `get_or_create_general_folder` was callable directly by any 
  authenticated client with an arbitrary `p_user_id`, bypassing the API route. 
  Fixed via `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated; GRANT ... TO 
  service_role`. Verified live against `information_schema.routine_privileges`.
- **Hard constraint carried forward:** `p_user_id` for this function must be 
  sourced server-side only, from the authenticated session — never from client 
  payload. The function has no internal identity binding by design (to keep the 
  future `handle_new_user()` path clean), so the calling API route is the only 
  remaining enforcement layer.

## Session 3 — Folder CRUD API Routes
- **Decision: move is a single unified endpoint**, not separate goal/folder move 
  routes. `echo_entry_links`' container_type discriminator makes both moves the 
  same underlying write (which nullable column is populated).
- **Product rule confirmed: an entry is never linked to both a folder and a goal 
  simultaneously.** Goal-linked entries are labeled under the project name instead. 
  This means `delete_contents` never needs to special-case dual-linked entries.
- **Finding: `echo_entry_links.echo_entry_id → echo_entries.id` is ON DELETE 
  CASCADE** (from migration 005, unchanged by the 012 rename) — contrasts with the 
  deliberate RESTRICT on `folder_id`. `delete_contents` deletes `echo_entries` rows 
  directly; cascade clears their links automatically before the folder row is 
  removed.
- **Decision: delete operations run as SECURITY INVOKER plpgsql functions** 
  (`delete_folder_reassign`, `delete_folder_with_contents`), each wrapping its mode 
  in one atomic transaction, since supabase-js has no client-side multi-statement 
  transaction support over PostgREST. Kept INVOKER (not DEFINER) with an internal 
  ownership/is_general re-check as defense-in-depth on top of RLS — deliberately 
  not repeating the Session 2 RPC-exposure pattern.
- **Decision: `moveEntryContainer` only touches the confirmed link row**, leaving 
  unconfirmed `ai_suggested` goal links untouched — consistent with `ai_suggested` 
  being logged as UNDECIDED, not dead, and not something to disturb via unrelated 
  feature work.

## Still open / unresolved
- `ai_suggested` link-source: UNDECIDED. Revisit after Block 2 (Echo Output Loop) 
  ships, contingent on whether BRT classification gets wired to consume pgvector 
  embeddings.
- `brt_user` write path scope: not yet decided.
- `handle_new_user()` P0 fix: unscheduled, separate session.
- Migration squash: planned, not yet executed.

## Session 3 — Folder CRUD API Routes (addendum)

- **Finding/Fix: Metro doesn't tree-shake at export granularity.** Server-only code 
  co-located in the same module as client-safe exports ships into the client bundle 
  in full — including function bodies — even when nothing client-side actually calls 
  it. The fail-closed runtime guard (throws on missing env var) prevented the secret 
  *value* from leaking, but the code path itself was still present client-side, which 
  is a gap independent of whether the guard holds.
- **Principle: any service-role / privileged-credential code must live in its own 
  module, never co-located with client-safe exports in the same file.** Applied here 
  via `lib/db/service-client.ts`, split out of `lib/db/client.ts`. This is the pattern 
  to follow for any future server-only utility, not a one-off fix — check new server-
  only helpers against this before adding them to a shared file.

  ### Goal Ring — Time-Decay Only, No Completion Fallback
Date: 2026-07-14
Owner: Ariel

**Context:** `getGoalRingProgress()` (features/goals/utils/ringProgress.ts)
previously fell back to `goal.progress` (measurable-completion percentage)
when a goal had no deadline. This coupled the ring to the unresolved
`current_value`/`measurable_logs` divergence found in a prior audit, and
was never a deliberate design — audit confirmed no "narrative goal"
concept exists for null deadlines the way it does for `target_frequency`.

**Decision:**
- `getGoalRingProgress()` is pure time-decay only:
  `elapsed / (deadline - createdAt)`, clamped `[0,100]`. No completion
  fallback, under any condition.
- Return type changes from `number` to `number | null`. Returns `null`
  exactly when `goal.deadline` is null.
- Scope: `ProjectCard.tsx` only (the sole consumer). `GoalCard.tsx` is
  explicitly untouched — its flat completion bar and local `daysUntil()`
  label are unaffected by this decision.
- Null-deadline behavior in `ProjectCard`: the ring is **not rendered at
  all** for that goal — full omission, not an empty/neutral placeholder
  ring.

**Rationale:** Deadline is required at creation but can become null
post-creation (explicit "Clear" action on `GoalDetailHeader`, or via the
separate AI-goal-generation path). `ProjectCard` already has an
established null-handling convention in the sibling `resolveDueDate()`
function (blank label, secondary color, no fabricated data) — full
omission is the closest visual equivalent for a ring, since a ring can't
render "blank" the way text can.

**Out of scope:** `goal.progress` / measurable-completion logic (unchanged,
still used by `GoalCard` and the dashboard), `GoalCard` rendering, the
`current_value`/`measurable_logs` divergence (separate, still unresolved,
tracked from the earlier audit).

### Projects — No Deadline, No Aggregate Progress
Date: 2026-07-14
Owner: Ariel

**Decision:**
- Projects have no deadline field — not now, not derived from children.
  No schema change needed (confirmed via audit: no deadline column
  exists today).
- Projects surface no progress/completion metric — no average, no count,
  nothing. The existing flat average (`aggregateProgress`,
  app/(app)/projects/[id].tsx:66-68) is removed, not replaced.
- Ungrouped goals remain fully valid — no forcing function requiring
  `project_id` at creation. No change needed (already current behavior).
- A Project's mission-control function is purely organizational: title,
  description, and its list of member goals. Each goal's own
  deadline-decay ring and status stand independently within that list.

**Rationale:** The removed aggregate duplicated the same
completion-derived signal already excluded from the individual goal ring
for reliability reasons. Rather than build a second unreliable rollup,
project-level "progress" is dropped entirely — visibility into each
member goal's own state serves the mission-control function without
inventing a number that isn't trustworthy yet.

**Out of scope:** Any future project-level metric (explicitly ruled out,
not TBD), Rollover/Momentum, SMART format, goal breakdown/QA structure.

### Document 3: Superseded-Goal Read-Only Guard

Superseded-goal read-only guard (Doc 3): has_successor derived via batched reverse query on previous_goal_id (extension of existing cloneGoalWithMeasurables check pattern), attached to goal objects at list-fetch and detail-fetch. UI-layer enforcement only; server backstop limited to completeMeasurable (409, matches GOAL_ALREADY_EXTENDED convention). No RLS/new routes this phase — reaffirms Doc 3's "not a data-integrity concern" framing.

### 2026-07-15 — Amendment to Document 2 (CLOSED): reflection/reflected_at + title override on extend

**Status:** Document 2 (rollout_momentum/02_extended_writepath.md) was
CLOSED. This is a schema and write-path amendment reopening it, not new
scope — logged separately per amendment convention.

**Decision:**
- Migration 022 adds `goals.reflection` (text, nullable) and
  `goals.reflected_at` (timestamptz, nullable). Both stay null unless a
  reflection is written at extension time — reflection remains skippable,
  per Document 4's original locked decision (unchanged; Document 4's
  Echo-linking design is untouched by this amendment).
- `cloneGoalWithMeasurables` (lib/db/goals.ts) gains two optional trailing
  params: `title?: string`, `reflection?: string`. Omitted/blank `title`
  preserves the existing verbatim-copy default; omitted `reflection` leaves
  both new columns null. Both are written onto the new (successor) goal
  row only, alongside `prior_phase_summary` — `prior_phase_summary`'s own
  computation logic is unchanged.
- `POST /api/goals/[id]/extend` now accepts optional `title` and
  `reflection` string fields, passed through unchanged.
- Added server-side validation that `deadline` must be strictly in the
  future, rejecting with 400 before reaching the DB layer. Previously this
  was only guaranteed by the client offering exclusively 30/60/90-day
  buttons; a Custom date picker (Task 5) removes that guarantee, so the
  server must now enforce it directly.

**Out of scope (unchanged from this amendment):** UI work (goal-detail,
extend modal, Momentum, Superseded views), ring color logic.

### 2026-07-20 — Milestones, Trackers, Goal Archive, and Completion

**Status:** Locked. This supersedes the 2026-03-29 measurable-types decision
and the later convention that “Milestones” was only a UI alias. Those earlier
entries remain historical records of the architecture at their dates.

**Decision:**

- **Milestones** are one-time events critical to a goal. Their completion
  evidence is `milestones.completed_at`: `NULL` means pending, and a timestamp
  means completed.
- **Trackers** are counter, habit, or checklist measures with repeatable
  `daily`, `weekly`, or `monthly` cadence. A one-time event is a milestone, not
  a tracker. Legacy tracker rows whose frequency was `once` are normalized to
  `NULL`; new tracker-frequency constraints do not accept `once`.
- **Archived** is the fifth goal status, alongside `active`, `complete`,
  `stagnant`, and `discovered`. Archived goals are excluded from normal goal
  feeds and remain accessible through Settings.
- Goal completion is a one-way action available from goal detail. It is not a
  toggle and does not restore a prior status.
- Migration `025_goal_milestones_trackers_archive.sql` is a coordinated hard
  cutover: `measurables` becomes `trackers`, `measurable_logs` becomes
  `tracker_logs`, and `measurable_id` becomes `tracker_id`. No compatibility
  view, table alias, or type alias should preserve the old domain names.

**Rationale:** One-time critical events and repeatable measures have different
semantics and completion evidence. Locking separate canonical names at the
database, type, API, AI-contract, and UI layers prevents those concepts from
drifting together again.
