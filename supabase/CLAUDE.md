# supabase/CLAUDE.md — Database & Migration Rules

Owner: CTO. Cascade Level 3.

## Migration Conventions
- Sequential numbering: 001, 002, ... currently through 009. Next: 010.
- Filename: NNN_description.sql
- Always enable RLS on new tables.
- Always add RLS policies in the same migration that creates the table.
- FK references: verify actual column names before writing. Audit first.

## Current Schema (post-009)
- profiles, goals, projects, measurables, measurable_logs
- echo_entries, echo_sessions (renamed from starlog_* in 009)
- ai_usage

## Incoming (010-014, from implementation guide)
- 014: spaces
- 015: space_members
- 016: add space_id to goals + projects (nullable)
- 017: vaults + vault_items
- 018: echo_goal_links + backfill from echo_entries.goal_id

## Rules
- Nullable FKs for new columns on existing tables (no data migration needed).
- echo_entries.goal_id is PRESERVED. Do not drop it. echo_goal_links is the canonical bridge.
- Vault auto-creation: one vault per goal. Enforced by unique(goal_id) on vaults.
- RLS: vaults scoped to owner_id. vault_items scoped to vault ownership.
- RLS: spaces scoped to owner + members. space_members scoped to space membership.
- Never modify existing RLS policies in new migrations.