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