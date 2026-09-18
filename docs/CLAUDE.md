# CLAUDE.md — Ohara Architectural Constitution
# Last updated: July 2026 | Goal-detail redesign

## What Ohara Is
Goal-first personal growth platform. Social operating system.
Stack: Expo (RN Web, SSR), Vercel, Supabase, Anthropic API, NativeWind, Zustand, TS strict.
Theme (current accent correction): neutral/off-white page and card surfaces, vibrant OHARA green (#63C174) accent, neutral dark surfaces, and Inter throughout. Canonical tokens live in constants/colors.ts (LIGHT_THEME/DARK_THEME). Older earth/sage values are retired as application-brand accents; category and BRT colors retain their independent semantic meaning.

## Data Model (Current)
- **Spaces**: contained environments (personal | team | institutional | community). Every user has a personal space. goals and projects have nullable space_id FK.
- **Goals**: atomic unit of behavior. Has separate one-time milestones and
  repeatable **Tasks** (canonical since migrations 047–051: `tasks`,
  `task_schedules`, `task_occurrences`), status
  (active/complete/stagnant/discovered/archived), category, and optional
  project_id FK. Legacy `trackers`/`tracker_logs` were superseded by Tasks and are
  now read-only (`authenticated` writes frozen at the cutover).
- **Projects**: long-term ambition containers. Aggregate multiple goals. Have their own Vault.
- **Vaults**: goal-bound content workspaces. One vault per goal (auto-created). Contains vault_items (note | link | document | insight | action_update).
- **Echo**: standalone journaling (BRT: Bud/Rose/Thorn). Separate Haiku-backed path in lib/ai/echo-client.ts.
- **Echo-Goal Links**: many-to-many bridge (echo_goal_links table). Supports manual, ai_suggested, ai_auto linking. Replaces single goal_id FK for linking.
- **Intelligence**: summarization over storage. Never persists raw conversations. Updates character_profile JSONB. Gated on isProfileSufficient().
- **Constellation**: shipped owner-private visual graph. Goals and category
  hubs form the primary structure; categorized Entries appear as sparse
  goal-specific BRT moons. Web nodes are movable, goal moons follow their
  parent, and owner layouts persist through migration 034.
- **Circles**: the friends-only social layer that is Home (`/dashboard`, nav
  label "Home"). Private by default; each user may make one Goal public and send
  per-Goal invitations to friends. Tables (migrations 053–054): `circle_posts`
  (reflection/milestone posts with a server-snapshotted link title + author
  description), `post_encouragements`, `post_comments`, `saved_posts`,
  `goal_share_invites`, plus the `goals_one_public_per_user` partial unique index.
  Privacy spine (CD-004): non-owners never read base tables — shared Goal data is
  only ever the whitelisted `circles_goal_summary` (title, category, status,
  top-level milestone titles + done, this week's Task count). Built behind
  `FEATURES.CIRCLES_ENABLED` (`constants/features.ts`); design + decisions live in
  `design/circles/`. Server: `lib/db/circles.ts` + `lib/db/circles-core.ts` +
  `app/api/circles/**`. Client: `features/circles/`.

## Core Architecture Rules

### Color Token Registries
`LIGHT_THEME` (constants/colors.ts) is the sole canonical color registry — see Theme line above. `COLORS`, `STATUS`, and `THEME` (former pre-`LIGHT_THEME` scaffold/legacy exports) have been fully retired and removed from constants/colors.ts; all former consumers migrated to `LIGHT_THEME` (status-badge colors live at `LIGHT_THEME.feedback.*`, including `feedback.pending` for unconfirmed AI-suggestion banners). One registry remains live and is not a replacement for `LIGHT_THEME`:
- **`tailwind.config.js` `theme.extend.colors`** — has two lineages, both real:
  - Kebab-case mirrors of `LIGHT_THEME` keys (`page-bg`, `emerald-deep`, `teal-mid`, `goal-card`, `border-warm`, etc.), added because NativeWind `className` strings can't reference a JS object literal. When changing a `LIGHT_THEME` value that has a Tailwind mirror, update both in the same commit.
  - Older pre-`LIGHT_THEME` scaffold keys (`cream`, `near-black`, `earth-green`, `card-bg`, `muted`, `dark-bg`, `ink`, `primary`) still driving un-migrated screens: auth flow (`app/(auth)/login.tsx`, `signup.tsx`, `callback.tsx`), `app/about.tsx`, `app/index.tsx`, `components/ui/Modal.tsx`/`Input.tsx`/`Screen.tsx`/`EmptyStateCard.tsx`/`ReflectionCard.tsx`, `AccountModal.tsx`, `SettingsModal.tsx`, and several Echo modals. These are not documented elsewhere and are not yet retired — don't assume they're dead code, but don't add new usages either; migrate to the `LIGHT_THEME`-mirrored keys when touching those files.

### SSR Safety (CRITICAL)
Modules imported at _layout.tsx top level must NEVER throw at module load time.
- Layer 1 (module init): safe fallbacks only (?? '', isDatabaseConfigured, null as any)
- Layer 2 (hooks, useEffect, API routes): validate and throw
- EXPO_PUBLIC_* vars are Metro build-time only, not guaranteed in Vercel SSR runtime

### AI Layer
- All AI calls go through lib/ai/client.ts (single chokepoint for logging, cost, model swapping)
- Echo uses lib/ai/echo-client.ts (separate Haiku path, clean abstraction boundary)
- Vault insights: PLANNED as lib/ai/vault-insights.ts (Haiku, suggestions only, user confirms) — NOT yet built; slated for the Vaults revival (see tracker-metrics/tasks/design/002). Do not cite as an existing module.
- Phase 1: Haiku everywhere. Phase 2: Sonnet for goal creation.
- AI-generated insights require user confirmation (metadata.confirmed). Never auto-applied.

### Data Rules
- userId ALWAYS from server-side session. Never from request body.
- Summarization over storage: raw conversations never persisted, only structured summaries.
- echo_entries.goal_id preserved for backward compat. echo_goal_links is canonical many-to-many.
- Vault creation failure must NOT block goal creation. Non-blocking, log errors.
- Space creation failure must NOT block signup. Non-blocking, log errors.
- Milestones are one-time goal-critical events; `milestones.completed_at` is
  their completion evidence (`NULL` means pending).
- Tasks (canonical since migrations 047–051) are the repeatable/scheduled goal
  measures: `completion_mode` binary | quantity, with versioned `task_schedules`
  (daily | weekly — no monthly) and materialized `task_occurrences`. Do not model
  one-time events as Tasks (use milestones). Legacy `trackers`/`tracker_logs` are
  frozen (read-only) — never write them.
- Archived is a fifth goal status. Archived goals stay out of normal feeds and
  are accessed through Settings.
- Goal completion is one-way and may only be initiated from goal detail; do not
  expose a reversible completion toggle.

### Home Data Flow (Today's Focus / Next Step)
Home (`/dashboard`) is Circles, but its greeting + Today's Focus + Next Step are
goal-derived and load on a deliberately de-waterfalled, cached path. Preserve
these seams:
- **Goals**: `useGoals` is stale-while-revalidate over the goal Zustand store —
  cached goals paint instantly on return-nav (no spinner), revalidate in the
  background, dedupe in-flight loads, and key freshness by `userId` (the store
  isn't cleared on logout). Do not reintroduce a blanket refetch-on-every-mount.
- **Reconcile off the read path**: `fetchGoals` runs
  `reconcile_goal_expiration_v1` fire-and-forget (it's self-healing), never
  awaiting a maintenance write before the goals SELECT. Keep it non-blocking.
- **One Home aggregator, not N client fetches**: the goal-derived Today's Focus
  signals (this week's canonical Task counts + reflection-ordering timestamps)
  come from a single `GET /api/home/summary`, computed server-side in parallel,
  resolving the caller's active goals itself. Client access is the SWR-cached
  `useHomeSummary` hook (mirrors `useMomentumHomeSummary`). Server:
  `lib/db/home-summary.ts` + `lib/db/tasks.ts`. **A new Home signal is a field on
  this aggregator, not a new client round-trip.** Task counts read canonical
  `task_occurrences` only — never legacy trackers (asserted in
  `features/tasks/architecture.test.ts`).
- **Presentation**: `TodayFocusSummary` / `NextStepPanel` / the loading state
  live in `features/goals/components/home/` (`TodayFocus` composer). `dashboard.tsx`
  stays thin composition. Kept in `features/goals` (not a `features/home` slice)
  to respect the no-cross-feature-import rule (features/CLAUDE.md).

### Naming (Current, Do Not Reference Old Names)
- Echo (not Starlog)
- Entry/Entries is the canonical user-facing record term; existing Echo route,
  feature, database, and service identifiers remain for compatibility.
- Ohara AI (not Polaris, not Thuban, not Guides, not Clo/Lach/Atri)
- Milestones (one-time critical goal events)
- Tasks (canonical repeatable goal measures since migrations 047–051;
  `completion_mode` binary | quantity). "Trackers" (migration 025) is the frozen
  legacy predecessor — read-only, not for new work.
- Vault (goal-bound workspace)
- Constellation (personal visual graph), Atlas (B2B aggregate view)
- Circles (the friends-only social layer; it is Home / `/dashboard`, nav label
  "Home"). A shared post is a "post"; the tables keep the `circle_*` prefix.

### Cascade Levels
- L1: visual files — change freely
- L2: coordinate with lane owner first
- L3: team decision required — types, schema, AI output contracts

### What NOT To Build
- The friends-only **Circles** feed (Home) is the one shipped social surface —
  built behind `FEATURES.CIRCLES_ENABLED`; see Data Model. Still not built: a
  public/discovery feed, profile pages, and social push notifications (Phase 2).
- No Obsidian-style free-form node linking (Ohara uses AI-assisted extraction)
- No free-floating notes (everything tied to a goal or Echo stream)
- No document upload UI yet (Phase 1.5)
- No arbitrary Constellation edge authoring or drag-to-connect; movement is
  layout preference only and cannot change graph semantics.
- No institutional or community Space UI (Phase 3)
- Olive gradient: discarded. Do not reference.
- Multi-Guide personalities (Clo, Lach, Atri): dropped. Single Ohara voice.

## File Ownership
- CEO (Ariel): lib/ai/*, types/*, constants/*, architecture, CLAUDE.md
- CTO: lib/db/*, supabase/migrations/*, app/api/*, hooks/*, store/*
- VP Product: components/*, app/(app)/*, app/goals/*, app/projects/*, features/*
- CFO: legal, outreach, pilot coordination

Nested CLAUDE.md files (components/, lib/ai/, lib/db/, supabase/, types/,
features/) are directory-scoped to their own file ownership above — never
edit them via a blanket find/replace across all CLAUDE.md files. A repo-wide
pattern (e.g. a color-token rename) must be applied per-file, checking that
file's actual directory scope, not copy-propagated from wherever it was first
written.

## Key Files
- API_CONTRACT.md, AI_RESPONSE_SCHEMA.md, ARCHITECTURE.md, DECISIONS.md
- CONTEXT.md (15-line session opener, read first)
- CHANGELOGCODEX.md (Codex reads/writes each session) — keep it a RECENT ROLLING
  WINDOW, not a monolith. Append a short dated entry per session; do not rewrite
  the whole file. When it grows large, roll the aged-out entries into the archive
  (see Archive below). It is intentionally not the full history.
- ohara_vaults_spec.docx (Vaults, Spaces, Constellation, UI spec)
- ohara_implementation_guide.docx (12 prompt execution plan)

## Archive
Historical and superseded material lives in a separate repo,
**`jvillalta1903-cmyk/oharaai-archive`** (pending transfer to the `teamoharaai`
org), to keep this repo lean and pushes fast. It holds: the full Codex changelog
(`CHANGELOGCODEX-full.md`), old Constellation design-reference renders
(`docs/constellation/reference/`), superseded specs (`docs/*.pdf|*.docx`), and the
changelog/audits/prompts folders for completed initiatives (Tracker Metrics,
Circles). Paths there mirror their original location here.
- Agents: if you need history, decisions, or old design references not present in
  this repo, look in the archive — do NOT copy that content back in-tree; link to it.
- Only *living guidance* stays here (this file + nested CLAUDE.md, ARCHITECTURE.md,
  DECISIONS.md, API_CONTRACT.md, AI_RESPONSE_SCHEMA.md, CONTEXT.md). Append-only
  history and heavy binaries belong in the archive.

## Validation
npx tsc --noEmit must pass before and after every change. No exceptions.
