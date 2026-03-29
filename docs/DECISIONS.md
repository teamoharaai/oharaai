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
**Impact:** `starlog_entries.ai_opted_in` boolean controls flow. Pipeline trigger is decoupled from pipeline logic.

### 2026-03-29 — Unified Starlog Table with Goal FK

**Decision:** Goal-specific journal entries and general journal entries live in the same `starlog_entries` table. `goal_id` is a nullable FK.
**Reason:** Same AI pipeline, same components, same sharing model. Avoids duplicate tables. Goal activity feed pulls from starlog where `goal_id` matches.
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
**Impact:** `features/auth/`, `features/goals/`, `features/starlog/`, `features/profile/`, `features/dashboard/`. Shared infra stays in `lib/`.

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