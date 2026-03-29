# Architecture — TODO
# Architecture — Ohara

> Permanent reference for folder conventions, data flow patterns, and component rules.
> Update this when architecture decisions change. Do not put temporary task info here.

## Folder structure

```
oharaai/
  app/                    ← Expo Router file-based routing. Keep thin.
  features/               ← Vertical feature slices. Each feature owns its code.
    {feature}/
      components/         ← UI components used only by this feature
      hooks/              ← React hooks used only by this feature
      services/           ← Data fetching, business logic, Supabase queries
      store.ts            ← Zustand store for this feature's state
      types.ts            ← TypeScript interfaces for this feature
  components/
    ui/                   ← Shared primitives (Button, Card, Input, Modal, etc.)
    layout/               ← Shared wrappers (Screen, Header)
  lib/
    ai/                   ← AI infrastructure (shared across features)
      client.ts           ← Single LLM call chokepoint — all AI goes through here
      config.ts           ← Model selection, feature flags, token limits
      queue.ts            ← Async job queue for AI processing
      schemas/            ← Zod validation schemas (one per pipeline)
      prompts/            ← System prompt strings (one per pipeline)
      pipelines/          ← Orchestration functions (one per pipeline)
    db/
      client.ts           ← Supabase singleton
    rules/                ← Deterministic logic (no LLM, no cost)
    utils/                ← Pure helper functions
  constants/              ← App-wide constants (colors, feature flags, themes)
  supabase/migrations/    ← Numbered SQL migration files
  docs/                   ← Living documentation
  scripts/                ← Dev tooling (stress tests, seed scripts)
  types/
    global.ts             ← Truly global types (env vars, Supabase generated types)
    supabase.ts           ← Auto-generated Supabase DB types
```

## Data flow pattern

```
Route (app/) → Hook (features/*/hooks/) → Service (features/*/services/) → Supabase
                  ↕                            ↕
             Store (Zustand)            lib/ai/pipelines/ (if AI needed)
                  ↕                            ↕
          Component (features/*/components/)  lib/ai/client.ts → Anthropic API
```

Rules:
- **Routes** import feature components and pass route params. No logic.
- **Hooks** wire services to stores. They call services, update stores, return state.
- **Services** handle Supabase queries and AI pipeline calls. Pure async functions.
- **Stores** hold client state. One per feature. Never shared across features.
- **Components** receive data as props. Never call services or Supabase directly.
- **lib/ai/** is called by services, never by components or hooks.

## Feature ownership rules

If code is used by **one feature** → it lives in that feature's folder.
If code is used by **two or more features** → it lives in `lib/`, `components/ui/`, or `types/global.ts`.

When in doubt, start inside the feature. Extract to shared only when a second consumer appears.

## AI layer rules

1. All AI calls route through `lib/ai/client.ts` — the single chokepoint
2. All AI calls happen in Supabase Edge Functions — never client-side
3. Every call is logged to the `ai_usage` table (tokens, latency, errors)
4. Every response is validated against Zod schemas in `lib/ai/schemas/`
5. Failed validation → retry once → log error → graceful fallback
6. Feature flags in `lib/ai/config.ts` control which pipelines are active
7. Prompts and schemas must match `docs/AI_RESPONSE_SCHEMA.md` — update doc first

## Database rules

1. RLS enabled on all tables, no exceptions
2. Every schema change requires a numbered migration in `supabase/migrations/`
3. Foreign keys with appropriate CASCADE/SET NULL behavior
4. Indexes on all frequently queried columns (user_id, goal_id, status)
5. JSONB for flexible data (character profiles), typed columns for structured data

## Naming conventions

- Files: `kebab-case.ts` for services/utils, `PascalCase.tsx` for components
- Types: `PascalCase` for interfaces, `camelCase` for type aliases
- Zustand stores: `use{Feature}Store`
- Hooks: `use{Thing}` — returns state and/or actions
- Services: `{feature}-service.ts` — exports named async functions
- Constants: `UPPER_SNAKE_CASE`

## Scalability markers

These patterns exist specifically so Phase 2+ changes are config changes, not rewrites:

- `goal.is_public` → Phase 2 social sharing (default false, toggle ready)
- `starlog_entries.goal_id` nullable → entries work as general journal OR goal-specific
- `measurables.is_ai_suggested` → distinguishes user-created from LLM-suggested
- `ai_usage` table → cost monitoring from day one
- `lib/ai/config.ts` feature flags → pipelines toggle on/off without code changes
- `lib/rules/` separate from `lib/ai/` → clear boundary between free and paid logic
- Color themes on goals → visual identity carries into Phase 2 feed