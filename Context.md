# Ohara — Session Context

Ohara is a goal-first personal growth platform: SMART goal creation via conversational AI, Starlog journaling, and an Intelligence layer that builds a character profile over time. Solo developer (Ariel) in Phase 1 friends-and-family pilot.

## Stack
Expo (React Native Web, SSR mode) → Vercel · Supabase (auth, DB, RLS) · Anthropic API · NativeWind · Zustand · TypeScript strict mode

## Lane Ownership
- Ariel: `lib/ai/`, constants, types, architecture
- CTO: `lib/db/`, `supabase/migrations/`, `app/api/`, hooks, store
- VP Product: components, Starlog/Explore screens, research
- CFO: legal, outreach, content

## Key Files
`API_CONTRACT.md` · `AI_RESPONSE_SCHEMA.md` · `CLAUDE.md` · `AGENTS.md` · `schema.ts` · `CHANGELOGCODEX.md`

## AI Architecture
- Ohara (goal creation): Haiku Phase 1 → Sonnet Phase 2, `lib/ai/prompts/goal-creation.ts`
- Starlog reflection: Haiku always, `lib/ai/starlog-client.ts` + `lib/ai/prompts/starlog-reflection.ts`
- Summarization over storage: raw conversations never persisted, only structured summaries update character profile (JSONB)

## Current State (Phase 1 Pilot)
- Auth: Supabase auth working, `/auth/callback` 404 parked for Phase 2 (teammate has Auth0 solution)
- Schema: fully canonicalized, `tsc --noEmit` clean, RLS verified across all tables
- Goal creation: conversational AI with ambiguity detection (Flow A/B), 6-section draft scaffold, `[[GOAL_READY]]` finalization signal, Ohara voice/tone layer implemented
- Goal detail: Starlog entries display, measurables fully editable inline with optimistic UI + rollback
- Starlog: Haiku-backed reflection, `ai_insight_requested` gates API call, goal attachment supported
- Dashboard: loading/empty states polished, feature flags wired (`STARLOG_ENABLED=true`, `DISCOVERY_ENABLED=false`)
- Feature flags: `STARLOG_ENABLED` · `INTELLIGENCE_ENABLED` · `DISCOVERY_ENABLED` · `SOCIAL_ENABLED` · `COLLAGE_ENABLED`

## Canonical Schema Rules
- Goal status: `active / complete / stagnant / discovered` (never paused/completed/archived)
- Assumptions: always `string[]`, never optional
- All measurable writes scoped through RLS via `goal_id → goals.user_id = auth.uid()`
- `is_public` policy removed from goals table — Phase 2 feature

## Outstanding
- Dashboard redesign (Starlog entry point, Guide presence as Ohara voice, badge fix)
- Goal creation UI redesign (chat interface, olive gradient, mode selector)
- Flow A prompt: add encouraging words for ambiguous-but-specific inputs before follow-up questions
- Typography pass
- Landing page redesign
- Sub-goals / project format (Phase 2 — separate architecture discussion needed)

## Rules
- NativeWind only — no inline styles except dynamic theme colors
- No raw API calls outside `lib/ai/client.ts` or `lib/ai/starlog-client.ts`
- No hardcoded secrets
- CC reads CHANGELOGCODEX.md first to catch up on Codex sessions
- Codex writes to CHANGELOGCODEX.md after every session

## SSR Safety Rule (critical)

Modules imported at the top level of `app/_layout.tsx` must NEVER throw 
at module load time. This crashes the SSR handler before anything renders.

**Layer 1 — module initialization** (client.ts, any top-level import)
→ Safe fallbacks only. Never throw.
→ Export an `isDatabaseConfigured` boolean for downstream checks.

**Layer 2 — runtime** (hooks, useEffect, API routes)
→ Safe to validate, assert, and throw.
→ This is where "fail fast" belongs.

EXPO_PUBLIC_* vars are baked in by Metro at build time for the client 
bundle. They are NOT guaranteed to be visible in the Vercel SSR server 
function runtime. Never hard-throw on them at module load time.