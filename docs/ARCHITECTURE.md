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

### Goal domain

- **Milestones** are one-time events critical to a goal. A milestone is pending
  while `completed_at` is `NULL`; setting `completed_at` records its completion
  evidence.
- **Tasks** are the canonical action definition. One-time Tasks own one durable
  occurrence; recurring Tasks own a versioned IANA-timezone schedule and
  durable, stable-keyed occurrences. Quantity state belongs to an occurrence,
  not a permanently accumulating recurring definition.
- `trackers`, `tracker_logs`, and `action_logs` are preserved legacy sources.
  They are backfilled with provenance and remain read-only compatibility inputs;
  normal application writes use trusted Task RPCs.
- Goal status explicitly distinguishes `active`, `complete`, `archived`, and
  `expired` while retaining required legacy states. Only an Active Goal makes
  its active Tasks actionable; inactive Goal Task history remains readable.
- Goal completion is a one-way action initiated from goal detail. It is not a
  reversible status toggle.
- Migration `025_goal_milestones_trackers_archive.sql` records the older
  `measurables` → Tracker rename. Migrations 047–050 supersede Trackers for new
  action writes without deleting or renaming those legacy tables. Migration
  048's service-role-only catch-up is reused by Migration 050's atomic finalizer,
  which locks the legacy sources, verifies exact aggregate mappings, and only
  then freezes authenticated legacy DML. Read and service/admin access remain;
  the narrow rollback helper restores only the prior authenticated DML grants.

## Naming conventions

- Files: `kebab-case.ts` for services/utils, `PascalCase.tsx` for components
- Types: `PascalCase` for interfaces, `camelCase` for type aliases
- Zustand stores: `use{Feature}Store`
- Hooks: `use{Thing}` — returns state and/or actions
- Services: `{feature}-service.ts` — exports named async functions
- Constants: `UPPER_SNAKE_CASE`

## Scalability markers

These patterns exist specifically so Phase 2+ changes are config changes, not rewrites:

- `goal.visibility` → Phase 2 social sharing can expand safely without conflating circle-only access with fully public access
- `echo_entries.goal_id` nullable → entries work as general journal OR goal-specific
- `trackers.is_ai_suggested` → distinguishes user-created from LLM-suggested
- `ai_usage` table → cost monitoring from day one
- `lib/ai/config.ts` feature flags → pipelines toggle on/off without code changes
- `lib/rules/` separate from `lib/ai/` → clear boundary between free and paid logic
- Color themes on goals → visual identity carries into Phase 2 feed
