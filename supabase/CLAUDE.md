# supabase/CLAUDE.md — Database & Migration Rules

Owner: CTO. Cascade Level 3.

## Migration Conventions
- supabase/migrations/ holds 6 narrative baseline files (001-006), squashed
  2026-06-24 from the original 26 incremental migrations. 007-019 added since
  the squash (see below). Next new migration: 020.
- The pre-squash files (original 001-026) are archived, untouched, in
  supabase/migrations_archive_pre_squash_2026-06-24/ for historical reference.
  Do not re-run or restore them — supabase_migrations.schema_migrations tracks
  001-006 as applied, not the originals.
- Filename: NNN_description.sql
- Always enable RLS on new tables.
- Always add RLS policies in the same migration that creates the table.
- FK references: verify actual column names before writing. Audit first.

## Current Schema (post-006, i.e. the full squashed baseline)
- 001_core_schema_and_rls.sql: profiles, goals, milestones, measurables,
  measurable_logs, interests, pgvector extension, rls_auto_enable() safety net.
- 002_echo.sql: echo_sessions, echo_entries.
- 003_spaces_and_projects.sql: spaces, space_members, projects.
- 004_vaults_and_embeddings.sql: vaults, vault_items, HNSW indexes, match_* functions.
- 005_echo_goal_links.sql: echo_goal_links bridge table.
- 006_logging_and_rate_limiting.sql: action_logs, daily_ai_usage, ai_usage,
  consume_daily_ai_quota().
- 007_echo_title_and_brt_split.sql: echo_entries.title, brt_ai, brt_user.
- 008_profiles_timezone_and_user_trigger.sql: profiles.timezone; creates
  handle_new_user() and the on_auth_user_created trigger (see note below).
- 009_echo_ai_status.sql: echo_entries AI status tracking.
- 010_echo_retry_tracking.sql: echo_entries retry_count tracking.
- 011_profiles_account_expansion.sql: profiles.interests renamed to
  interests_user; adds avatar_url, bio, interests_ai, intelligence_enabled;
  creates the avatars storage bucket.
- 012_echo_entry_links.sql: generalizes echo_goal_links into echo_entry_links
  (renamed table) ahead of Echo Folders. Adds container_type ('goal' |
  'folder'), makes goal_id nullable, adds folder_id (nullable, no FK yet —
  Echo Folders table doesn't exist). No folder functionality built yet; this
  is schema restructuring only. See migration header for details.
- goals.mode column was dropped in the 2026-06-24 squash (was a single-value
  CHECK column, no longer carried). lib/db/goals.ts no longer inserts it.

## Rules
- Nullable FKs for new columns on existing tables (no data migration needed).
- echo_entries.goal_id is PRESERVED. Do not drop it. echo_entry_links (container_type='goal') is the canonical bridge.
- Vault auto-creation: one vault per goal. Enforced by unique(goal_id) on vaults.
- RLS: vaults scoped to owner_id. vault_items scoped to vault ownership.
- RLS: spaces scoped to owner + members. space_members scoped to space membership.
- Never modify existing RLS policies in new migrations.
- handle_new_user()/profile-row-on-signup: fixed in migration 008 (creates
  handle_new_user() + on_auth_user_created trigger on auth.users), which lets
  the pre-existing on_profile_created_create_space trigger (003) fire as
  intended. Reported verified live and firing correctly (profiles rows and
  personal spaces populating for real signups) per Session 0 Closeout,
  2026-07-08 — not independently re-confirmed by live query in that closeout
  session itself; treat as the current known state pending a live
  pg_get_functiondef / trigger-catalog check if this becomes load-bearing
  again.
