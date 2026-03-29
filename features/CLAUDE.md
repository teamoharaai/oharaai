# CLAUDE.md — features/

> Loaded when Claude Code touches files in this directory.

## What this directory is

Vertical feature slices. Each subdirectory owns everything for one product feature.

## Rules

1. **Each feature is self-contained.** Components, hooks, services, store, and types all live together.
2. **No cross-feature imports.** `features/goals/` must never import from `features/starlog/`. If two features need the same thing, extract it to `lib/` or `components/ui/`.
3. **Components receive data as props.** No component calls Supabase, services, or AI pipelines directly. Data flows: hook → store → component via props.
4. **One Zustand store per feature.** Named `use{Feature}Store`. Never import another feature's store.
5. **Services are pure async functions.** They query Supabase, call AI pipelines (via `lib/ai/`), and return typed data. No React, no hooks, no side effects.
6. **Types stay in their feature.** Only extract to `types/global.ts` if genuinely used by 3+ features.
7. **Route files in `app/` stay thin.** They import feature components and pass route params. No business logic in routes.

## Adding a new feature

1. Create `features/{name}/` with: `components/`, `hooks/`, `services/`, `store.ts`, `types.ts`
2. Define types first in `types.ts`
3. Build the service layer (Supabase queries)
4. Build the store (Zustand, consuming service return types)
5. Build hooks (wiring services to store)
6. Build components (consuming store via hooks, receiving data as props)
7. Create the route in `app/` that imports the top-level feature component

## Phase 2 notes

When social features arrive, they get their own feature slices: `features/feed/`, `features/forums/`. They do NOT modify existing feature internals. They may read from shared data via `lib/` services but never import from `features/goals/` or `features/starlog/` directly.