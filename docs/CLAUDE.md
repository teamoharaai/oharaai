# CLAUDE.md — Ohara Architectural Constitution
# Last updated: April 2026 | Post-Vaults spec

## What Ohara Is
Goal-first personal growth platform. Social operating system.
Stack: Expo (RN Web, SSR), Vercel, Supabase, Anthropic API, NativeWind, Zustand, TS strict.
Theme: cream (#F5F1EA) base, white (#FFFFFF) cards, forest green (#3D5247) accent, Inter + Lora.

## Data Model (Current)
- **Spaces**: contained environments (personal | team | institutional | community). Every user has a personal space. goals and projects have nullable space_id FK.
- **Goals**: atomic unit of behavior. Has milestones (UI rename of measurables), status (active/complete/stagnant/discovered), category, optional project_id FK.
- **Projects**: long-term ambition containers. Aggregate multiple goals. Have their own Vault.
- **Vaults**: goal-bound content workspaces. One vault per goal (auto-created). Contains vault_items (note | link | document | insight | action_update).
- **Echo**: standalone journaling (BRT: Bud/Rose/Thorn). Separate Haiku-backed path in lib/ai/echo-client.ts.
- **Echo-Goal Links**: many-to-many bridge (echo_goal_links table). Supports manual, ai_suggested, ai_auto linking. Replaces single goal_id FK for linking.
- **Intelligence**: summarization over storage. Never persists raw conversations. Updates character_profile JSONB. Gated on isProfileSufficient().
- **Constellation**: visual graph of goals, echo patterns, traits, vault insights. Schema (constellation_edges) exists, UI ships Phase 2.

## Core Architecture Rules

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

### Naming (Current, Do Not Reference Old Names)
- Echo (not Starlog)
- Ohara AI (not Polaris, not Thuban, not Guides, not Clo/Lach/Atri)
- Milestones (UI rename of measurables, no schema change)
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
- No constellation interactive graph yet (Phase 2, needs data density)
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