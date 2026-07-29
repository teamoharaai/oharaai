# CLAUDE.md — Ohara Architectural Constitution
# Last updated: July 2026 | Goal-detail redesign

## What Ohara Is
Goal-first personal growth platform. Social operating system.
Stack: Expo (RN Web, SSR), Vercel, Supabase, Anthropic API, NativeWind, Zustand, TS strict.
Theme (post-redesign warm ramp, Sessions 1–4c): warm cream (#F8F4EC) page base, white (#FFFFFF) cards, earth green (#4A7C5F) accent, deep-emerald (#1E3226) sidebar, warm ink text (#211F1A primary / #8A8172 secondary / #A79E8E muted), warm borders (#EDE6D8), Inter throughout. Canonical tokens live in constants/colors.ts (LIGHT_THEME). The old #F5F1EA / #3D5247 / #1A1F1C / #6B7B6E values are retired.

## Data Model (Current)
- **Spaces**: contained environments (personal | team | institutional | community). Every user has a personal space. goals and projects have nullable space_id FK.
- **Goals**: atomic unit of behavior. Has separate one-time milestones and
  repeatable trackers, status
  (active/complete/stagnant/discovered/archived), category, and optional
  project_id FK.
- **Projects**: long-term ambition containers. Aggregate multiple goals. Have their own Vault.
- **Vaults**: goal-bound content workspaces. One vault per goal (auto-created). Contains vault_items (note | link | document | insight | action_update).
- **Echo**: standalone journaling (BRT: Bud/Rose/Thorn). Separate Haiku-backed path in lib/ai/echo-client.ts.
- **Echo-Goal Links**: many-to-many bridge (echo_goal_links table). Supports manual, ai_suggested, ai_auto linking. Replaces single goal_id FK for linking.
- **Intelligence**: summarization over storage. Never persists raw conversations. Updates character_profile JSONB. Gated on isProfileSufficient().
- **Constellation**: shipped owner-private visual graph. Goals and category
  hubs form the primary structure; categorized Entries appear as sparse
  goal-specific BRT moons. Web nodes are movable, goal moons follow their
  parent, and owner layouts persist through migration 034.

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
- Vault insights use lib/ai/vault-insights.ts (Haiku, suggestions only, user confirms)
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
- Trackers are counter, habit, or checklist measures with a repeatable
  daily/weekly/monthly cadence. Do not model one-time events as trackers.
- Archived is a fifth goal status. Archived goals stay out of normal feeds and
  are accessed through Settings.
- Goal completion is one-way and may only be initiated from goal detail; do not
  expose a reversible completion toggle.

### Naming (Current, Do Not Reference Old Names)
- Echo (not Starlog)
- Entry/Entries is the canonical user-facing record term; existing Echo route,
  feature, database, and service identifiers remain for compatibility.
- Ohara AI (not Polaris, not Thuban, not Guides, not Clo/Lach/Atri)
- Milestones (one-time critical goal events)
- Trackers (counter, habit, or checklist measures; canonical schema name since
  migration 025)
- Vault (goal-bound workspace)
- Constellation (personal visual graph), Atlas (B2B aggregate view)

### Cascade Levels
- L1: visual files — change freely
- L2: coordinate with lane owner first
- L3: team decision required — types, schema, AI output contracts

### What NOT To Build
- No feed, no profile pages, no social push notifications (Phase 2)
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
- CHANGELOGCODEX.md (Codex reads/writes each session)
- ohara_vaults_spec.docx (Vaults, Spaces, Constellation, UI spec)
- ohara_implementation_guide.docx (12 prompt execution plan)

## Validation
npx tsc --noEmit must pass before and after every change. No exceptions.
