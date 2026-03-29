# CLAUDE.md — Ohara

> Single source of truth for Claude Code sessions. Last updated: 2026-03-29

## Project

Ohara is a goal-first social platform. Users create SMART goals, journal in "Starlog," and build a character profile through AI-powered conversation summarization. Raw conversations are never stored — only structured summaries. This is non-negotiable.

**Current phase:** Phase 1 — personal layer (goals, reflection, AI core). Solo build for friends-and-family pilot.

## Tech stack (locked)

- **Expo (React Native Web)** — single codebase, web + iOS + Android
- **Supabase** — auth, Postgres, RLS, Edge Functions, Storage
- **Anthropic API** — all AI calls server-side only via `lib/ai/client.ts`
- **NativeWind** — Tailwind utility classes for React Native
- **Zustand** — client state, one store per feature
- **TypeScript strict mode** — all files, no `any`

## Architecture

Feature-slice hybrid. Shared infra in `lib/`, feature code in `features/`.

See @docs/ARCHITECTURE.md for full structure and conventions.

## Critical rules — NEVER violate

1. **All AI calls go through `lib/ai/client.ts`** — never import Anthropic SDK elsewhere
2. **All AI calls are server-side only** — Supabase Edge Functions, never client
3. **Supabase RLS enabled on all tables** — never bypass, never disable
4. **No raw conversation storage** — only structured JSONB summaries
5. **No API keys in code** — all secrets from `process.env` / `.env.local`
6. **AI outputs must match schema** — see @docs/AI_RESPONSE_SCHEMA.md
7. **Types live in their feature** — `features/*/types.ts`, not a global dump
8. **Components receive data as props** — no component queries Supabase directly
9. **Every schema change needs a migration** — `supabase/migrations/`
10. **Bud/Rose/Thorn is internal taxonomy only** — never shown to users

## Folder structure (abbreviated)

```
app/              ← routes only, thin files
features/         ← vertical feature slices (auth, goals, starlog, profile, dashboard)
  {feature}/
    components/   ← feature-specific UI
    hooks/        ← feature-specific hooks
    services/     ← data fetching, business logic
    store.ts      ← Zustand store
    types.ts      ← feature types
components/ui/    ← shared primitives (Button, Card, Input, ProgressRing)
components/layout/← shared wrappers (Screen, Header)
lib/ai/           ← AI client, config, prompts, pipelines
lib/db/           ← Supabase client singleton
lib/rules/        ← deterministic logic (no LLM)
lib/utils/        ← date, validation helpers
constants/        ← colors, features flags, goal themes
```

## What is NOT built yet

- [ ] AI pipelines (client.ts exists as stub, no Anthropic SDK connected)
- [ ] Goal creation conversation flow
- [ ] Starlog AI insight (classification, Guide response, summarization) — toggle wired to DB, API call blocked by INTELLIGENCE_ENABLED flag
- [ ] Character profile system
- [ ] Discovery engine (Thorn pattern → goal suggestion)
- [ ] Hobby matcher
- [ ] Media uploads (Supabase Storage not configured)
- [ ] Social layer (Phase 2)
- [x] Starlog journaling screen — composer, goal picker, AI toggle, entry list (2026-03-29)
- [x] Goals dashboard — real Supabase query replaces mock data (2026-03-29)

## Commands

```bash
npx expo start --web     # dev server (web)
npx tsc --noEmit         # type check
npx expo start           # dev server (native)
```

## Key docs

- @docs/ARCHITECTURE.md — folder conventions, data flow, component rules
- @docs/AI_RESPONSE_SCHEMA.md — strict AI input/output contracts
- @docs/DECISIONS.md — dated decision log
- @docs/API_CONTRACT.md — endpoint shapes, frozen per sprint
- @docs/PHASE1_CHECKLIST.md — build progress tracker

## What NOT to do

- Do not create folders outside the structure above
- Do not install packages without checking `package.json` first
- Do not put business logic in route files — routes import feature components only
- Do not create global stores — each feature owns its Zustand store
- Do not use inline `style={{}}` except for dynamic theme colors
- Do not use CSS Grid for component internals — Flexbox only (Grid okay for dashboard card layout on web)
- Do not add social/sharing features — that is Phase 2

## Current session context

> Last updated: 2026-03-29

- **Tab bar**: Reduced to 3 tabs (Goals, Starlog, Explore). `goals` directory hidden with `href: null` — goal detail still reachable via `router.push`.
- **Goals data**: `fetchGoals` / `fetchGoalById` now query Supabase. `useGoals` and `useGoalDetail` get user via `supabase.auth.getUser()`. Mock data file retained but unused by production paths.
- **Starlog screen**: Full journaling UI in `features/starlog/components/StarlogScreen.tsx`. Composer (multiline input, goal picker modal, AI toggle), entry list. `useEntries` hook loads entries + active goals on mount. `createEntry` inserts to `starlog_entries`.
- **Migration 005**: Renames `raw_text → content` and `ai_opted_in → ai_insight_requested` on `starlog_entries`. Must be pushed before deploy — see "How to link and push migrations" guide at end of this file.
- **Auth callback route**: `app/(auth)/callback.tsx` handles post-email-verification redirects. Supports PKCE (`code` query param → `exchangeCodeForSession`) and implicit flow (hash `access_token` → `getSession`). On success redirects to `/(app)/dashboard`; on failure redirects to `/(auth)/login?error=...`. Login screen reads the `error` param on mount.