# Ohara — Session Context
# Paste at top of every CC/Codex session. Update after each session.

Ohara is a goal-first personal growth platform: SMART goal creation via conversational AI,
Echo journaling, and an Intelligence layer that builds a character profile over time.
Phase 1 friends-and-family pilot.

## Stack
Expo (React Native Web, SSR mode) → Vercel · Supabase (auth, DB, RLS) · Anthropic API (Haiku)
NativeWind · Zustand · TypeScript strict mode
Theme: cream #F5F1EA, white cards, forest green #3D5247, Inter + Lora

## Lane Ownership
- Ariel: `lib/ai/`, constants, types, architecture
- CTO: `lib/db/`, `supabase/migrations/`, `app/api/`, hooks, store
- VP Product: components, Echo/Explore screens, research
- CFO: legal, outreach, content

## Key Files
`API_CONTRACT.md` · `AI_RESPONSE_SCHEMA.md` · `CLAUDE.md` · `AGENTS.md` · `schema.ts`
`CHANGELOGCODEX.md` · `docs/context.md` (deprecated — root CONTEXT.md is canonical)

## Current State
- Migrations: through 022 (spaces.user_id → owner_id rename)
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
- Next migration number: 023

## Signal Layer Notes
- `latestBrtTags` on `GoalWithMeasurables` is derived via `deriveBrtTag()` in `features/goals/services/goal-service.ts`. Heuristic: bud → rose → thorn priority, max 3 tags, sorted by echo entry created_at desc. Phase 2 may replace with a dedicated `brt_tag` column.
- **Tracked debt**: `vaultNoteCount` should be renamed to `vaultItemCount` before Phase 1.5, when document/link vault items ship and the "note" framing becomes inaccurate. Affects: `features/goals/types.ts`, `features/goals/services/goal-service.ts`, `features/goals/components/GoalCard.tsx`, `features/goals/services/mock-data.ts`.

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