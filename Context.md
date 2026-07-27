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
- Migrations: through 032 (squashed baseline 001-006, followed by 007-032). Migration 032 adds the normalized Constellation persistence and RLS boundary. `supabase/CLAUDE.md` is the canonical migration ledger. Next migration number: 033 as of 2026-07-27; re-resolve immediately before creating a migration.
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
- Goal status: `active / draft / complete / stagnant / discovered / archived` from `lib/goals/schema.ts` (never `paused`, `completed`, or `in_progress`)
- Assumptions: always `string[]`, never optional
- All measurable writes scoped through RLS via `goal_id → goals.user_id = auth.uid()`
- Visibility: `private / circle / public` — non-owner access conservative until social ships
- vault_items has no milestone_id — milestone context not in schema yet
- spaces.owner_id is the owner column (renamed from user_id in migration 022); space_members.user_id is unchanged
- Next migration number: 033 as of 2026-07-27

## Constellation Contract (2026-07-27)
- Canonical decisions: `docs/constellation/DECISIONS.md`
- Earned/system nodes: `season / ambition / goal / reflection / trait / tension`
- User-authored `note / projection` content is a separate draft Annotation domain.
- Manual Echo-to-goal BRT organization uses separate Evidence Links; it never mutates the canonical Echo container row or `brt_user`.
- Bud/Rose/Thorn goal clusters are virtual, production fixtures are forbidden, and `accessEligible` is distinct from `hasGraphData`.
- Initial delivery is honest empty states plus a real-data read-only graph; annotations, Evidence Links, and inspectors are next; layout interaction, Timeline, Season Archive, arbitrary topology, and sharing are deferred.

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

last migration: 032 — migrations 001-006 are the 2026-06-24 narrative baseline; 007-032 are the current post-squash sequence. See `supabase/CLAUDE.md` for the complete ledger. Next new migration is 033 as of 2026-07-27.
