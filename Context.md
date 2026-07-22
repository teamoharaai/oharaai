# Ohara — Session Context
# Paste at top of every CC/Codex session. Update after each session.

Ohara is a goal-first personal growth platform: SMART goal creation via conversational AI,
Echo journaling, and an Intelligence layer that builds a character profile over time.
Phase 1 friends-and-family pilot.

## Stack
Expo (React Native Web, SSR mode) → Vercel · Supabase (auth, DB, RLS) · Anthropic API (Haiku)
NativeWind · Zustand · TypeScript strict mode
Theme (post-redesign warm ramp, Sessions 1–4c): warm cream #F8F4EC page, white cards, earth green #4A7C5F accent, deep-emerald #1E3226 sidebar, warm ink text (#211F1A/#8A8172/#A79E8E), warm borders #EDE6D8, Inter throughout. Tokens: constants/colors.ts LIGHT_THEME. Retired: #F5F1EA/#3D5247/#1A1F1C/#6B7B6E.

## Lane Ownership
- Ariel: `lib/ai/`, constants, types, architecture
- CTO: `lib/db/`, `supabase/migrations/`, `app/api/`, hooks, store
- VP Product: components, Echo/Explore screens, research
- CFO: legal, outreach, content

## Key Files
`API_CONTRACT.md` · `AI_RESPONSE_SCHEMA.md` · `CLAUDE.md` · `AGENTS.md` · `schema.ts`
`CHANGELOGCODEX.md` · `docs/context.md` (deprecated — root CONTEXT.md is canonical)

## Current State
- Migrations: through 011 (squashed baseline 001-006, 2026-06-24; 007 echo_entries.title/brt_ai/brt_user; 008 profiles.timezone + handle_new_user()/on_auth_user_created trigger; 009 echo ai_status; 010 echo retry tracking; 011 profiles account expansion + avatars bucket), all applied live per npx supabase db push (CHANGELOGCODEX.md, 2026-07-01 session). Next migration number: 012.
- `tsc --noEmit`: clean
- RLS: verified across all tables
- Auth: Supabase auth working; `/auth/callback` 404 parked (teammate has Auth0 solution)

## Shipped — Execution Loop Foundation
- `lib/db/vaults.ts`: getOrCreateVault · getVaultItems · addVaultItem · getVaultItemCount
- `app/goals/[id]/index.tsx`: goal detail (was [id].tsx — moved for nested routing)
- `app/goals/[id]/vault.tsx`: minimal vault screen (list entries + add note)
- `features/goals/components/MeasurablesPanel.tsx`: single goal-level vault count line above milestone rows; milestone tap navigates to vault
- `features/goals/components/MeasurableCard.tsx`: net zero change — restored to original structure
- `app/projects/[id].tsx`: placeholder Activity card removed
- `lib/db/goals.ts`: epoch fallback fixed (new Date(0) → new Date())
- Vault lookup chain: goal_id → vaults.goal_id → vaults.id → vault_items.vault_id (no direct goal_id on vault_items)

## Shipped — Service Layer (2026-04-06)
- `lib/db/vaults.ts`: rewritten with canonical API — `getVaultByGoalId` · `getVaultItems` (sort_order ASC) · `getVaultItemsByType` · `createVaultItem` · `updateVaultItem` · `deleteVaultItem` · `getVaultWithItems`. Legacy helpers preserved. Types from `types/vault.ts`.
- `lib/db/spaces.ts`: `getPersonalSpace` · `getSpacesForUser` · `createSpace` · `getSpaceMembers` · `addSpaceMember` · `removeSpaceMember`. Maps `owner_id → ownerId`, `joined_at → joinedAt`.
- `lib/db/echo-goal-links.ts`: `getLinksForEchoEntry` · `getLinksForGoal` · `getEchoEntriesForGoal` · `createLink` · `confirmLink` · `dismissLink` · `getUnconfirmedLinksForUser`. Two-query pattern for JOIN-dependent functions.

## Shipped — Type Layer (2026-04-06)
- `types/vault.ts`: Vault, VaultItem, VaultItemType, VaultItemMetadata (pure types, zero side effects)
- `types/space.ts`: Space, SpaceType, SpaceRole, SpaceMember
- `types/echo-link.ts`: EchoGoalLink, EchoLinkSource
- `types/activity.ts`: extended with three new ActivityItem variants (discriminated union on `kind`)
- `features/goals/components/ActivityFeed.tsx`: narrowing fix applied — exhaustive switch on `kind` now type-safe
- `tsc --noEmit`: clean after all above changes

## AI Architecture
- Goal creation (Ohara): Haiku Phase 1 → Sonnet Phase 2, `lib/ai/prompts/goal-creation.ts`
- Echo reflection: Haiku always, `lib/ai/echo-client.ts` + `lib/ai/prompts/echo-reflection.ts`
- Summarization over storage: raw conversations never persisted; only structured summaries update character profile (JSONB)

## Canonical Schema Rules
- Goal status: `active / complete / stagnant / discovered` (never paused/completed/archived)
- Assumptions: always `string[]`, never optional
- All measurable writes scoped through RLS via `goal_id → goals.user_id = auth.uid()`
- Visibility: `private / circle / public` — non-owner access conservative until social ships
- vault_items has no milestone_id — milestone context not in schema yet
- spaces.owner_id is the owner column (renamed from user_id in migration 022); space_members.user_id is unchanged
- Next migration number: 012

## Outstanding (Phase 1)
- Dashboard redesign: Echo entry point, Ohara voice/Guide presence, badge fix
- Goal creation UI redesign: chat interface, mode selector
- Flow A prompt: add encouraging words for ambiguous-but-specific inputs
- Typography pass
- Landing page redesign
- `/auth/callback` 404 resolution before pilot goes live

## Rules
- NativeWind only — no inline styles except dynamic theme colors
- No raw API calls outside `lib/ai/client.ts` or `lib/ai/echo-client.ts`
- No hardcoded secrets
- Read CLAUDE.md and CHANGELOGCODEX.md before starting any session
- Codex writes to CHANGELOGCODEX.md after every session
- Run `npx tsc --noEmit` before and after every task

last migration: 011 — migrations squashed 2026-06-24 from original 001-026 into narrative baselines 001-006, all confirmed applied live via schema_migrations. Migration 007 (echo_entries.title, brt_ai, brt_user) added 2026-06-24, confirmed applied live. Migrations 008 (profiles.timezone + handle_new_user()/on_auth_user_created trigger), 009 (echo ai_status), 010 (echo retry tracking), and 011 (profiles account expansion + avatars bucket) added since, all applied live per npx supabase db push (CHANGELOGCODEX.md, 2026-07-01 session). Old numbers (e.g. 023, 026) are historical/archived only; next new migration is 012.
