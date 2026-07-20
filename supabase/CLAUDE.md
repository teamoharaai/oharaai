# supabase/CLAUDE.md — Database & Migration Rules

Owner: CTO. Cascade Level 3.

## Migration Conventions
- supabase/migrations/ holds 6 narrative baseline files (001-006), squashed
  2026-06-24 from the original 26 incremental migrations. 007-025 were added
  after the squash (see below). Next new migration: 026.
- The pre-squash files (original 001-026) are archived, untouched, in
  supabase/migrations_archive_pre_squash_2026-06-24/ for historical reference.
  Do not re-run or restore them — supabase_migrations.schema_migrations tracks
  001-006 as applied, not the originals.
- Filename: NNN_description.sql
- Always enable RLS on new tables.
- Always add RLS policies in the same migration that creates the table.
- FK references: verify actual column names before writing. Audit first.

## Current Schema (post-006, i.e. the full squashed baseline)
- 001_core_schema_and_rls.sql: profiles, goals, milestones, the legacy
  measurable tables renamed by 025, interests, pgvector extension, and the
  rls_auto_enable() safety net.
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
- 013_echo_folders.sql: echo_folders, folder ownership/RLS, the folder_id FK on
  echo_entry_links, and lazy General-folder provisioning.
- 014_lock_down_general_folder_rpc.sql: restricts General-folder provisioning
  RPC execution to service_role.
- 015_folder_delete_functions.sql: transactional folder-delete RPCs.
- 016_echo_entry_links_one_confirmed.sql: enforces at most one confirmed
  container link per Echo entry.
- 017_eager_general_folder_provisioning.sql: provisions a General folder after
  profile creation.
- 018_echo_entry_links_system_default_source.sql: adds `system_default` as an
  Echo link source.
- 019_manual_goal_creation_target_frequency.sql: adds nullable
  goals.target_frequency.
- 020_goal_rollover_fields.sql: adds goals.previous_goal_id and
  prior_phase_summary.
- 021_previous_goal_id_unique.sql: makes previous_goal_id unique when present.
- 022_goal_reflection_fields.sql: adds goals.reflection and reflected_at.
- 023_agent_session_pipeline.sql: adds the durable agent-session ledger,
  structured project periods, and transactional Echo write support.
- 024_agent_session_idempotency_guard.sql: rejects idempotency-key reuse with
  a different agent-session operation or payload.
- 025_goal_milestones_trackers_archive.sql: hard-renames measurables to
  trackers and measurable_logs to tracker_logs, makes milestones one-time
  events with completed_at evidence, and adds archived as the fifth goal
  status. No old-name compatibility views or aliases are canonical after 025.
- goals.mode column was dropped in the 2026-06-24 squash (was a single-value
  CHECK column, no longer carried). lib/db/goals.ts no longer inserts it.

## Rules
- Nullable FKs for new columns on existing tables (no data migration needed).
- echo_entries.goal_id is PRESERVED. Do not drop it. echo_entry_links (container_type='goal') is the canonical bridge.
- Vault auto-creation: one vault per goal. Enforced by unique(goal_id) on vaults.
- RLS: vaults scoped to owner_id. vault_items scoped to vault ownership.
- RLS: spaces scoped to owner + members. space_members scoped to space membership.
- Do not broaden existing RLS policies in new migrations without an explicit,
  audited decision. Object-name-only policy renames may accompany a coordinated
  hard schema rename such as migration 025.
- Milestones are one-time critical events; `milestones.completed_at IS NULL`
  means pending. Trackers are counter, habit, or checklist measures with
  repeatable daily/weekly/monthly cadence only.
- `archived` is a fifth goal status. Normal feeds exclude archived goals;
  Settings is the access point for them.
- handle_new_user()/profile-row-on-signup: fixed in migration 008 (creates
  handle_new_user() + on_auth_user_created trigger on auth.users), which lets
  the pre-existing on_profile_created_create_space trigger (003) fire as
  intended. Reported verified live and firing correctly (profiles rows and
  personal spaces populating for real signups) per Session 0 Closeout,
  2026-07-08 — not independently re-confirmed by live query in that closeout
  session itself; treat as the current known state pending a live
  pg_get_functiondef / trigger-catalog check if this becomes load-bearing
  again.
