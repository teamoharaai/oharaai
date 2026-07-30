# supabase/CLAUDE.md — Database & Migration Rules

Owner: CTO. Cascade Level 3.

## Migration Conventions
- supabase/migrations/ holds 6 narrative baseline files (001-006), squashed
  2026-06-24 from the original 26 incremental migrations. 007-035 were added
  after the squash (see below). Next new migration: 036.
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
- 026_goal_category_taxonomy.sql: expands goals.category CHECK to the
  seven-category redesign taxonomy (legacy values kept valid); realigns the
  start_agent_session() category guard to match.
- 027_goal_draft_status.sql: adds `draft` as a goals.status value; keeps
  `active` as the default.
- 028_friend_connections_invite_links_usernames.sql: social-graph foundation.
  Adds profiles.username (citext, NOT NULL, UNIQUE, `^[a-z0-9_]{3,20}$` format
  CHECK), backfilled from display_name via slugify+dedupe. Creates
  friend_connections (request/accept, partial unique index on the unordered
  {requester,addressee} pair WHERE status in pending/accepted — declined rows
  persist as history) and invite_links (crypto-random code via
  generate_invite_code(), owner-only RLS, no public SELECT). RPCs (all SECURITY
  DEFINER, none broaden profiles RLS): get_friend_count, search_profiles_by_username
  (3-char min, prefix, cap 20), get_profiles_by_ids, redeem_invite_link (writes
  accepted directly, atomic uses_count, self/expired/exhausted guards,
  already-connected + pending-upgrade handled gracefully). handle_new_user()
  (008) now populates username from raw_user_meta_data->>'username' when valid
  and free, else slugify-fallback; exception-wrapping preserved. citext
  extension enabled. Shared helper generate_unique_username(base, id) drives both
  backfill and signup. Applied and verified live 2026-07-23.
- 029_check_username_available.sql: adds check_username_available(check_username
  text) RETURNS boolean — SECURITY DEFINER, STABLE, search_path public,extensions.
  Anonymous-safe availability check for the signup form: 028's
  search_profiles_by_username is authenticated-only and returns profile data, so
  it can't serve the pre-signup (anon) check. This function normalizes input with
  btrim(lower(...)) (matching handle_new_user), applies the same
  `^[a-z0-9_]{3,20}$` format guard as the column CHECK and returns false (never
  raises) on a non-match, then returns NOT EXISTS on an exact case-insensitive
  (citext) match — a boolean only, no name/avatar/list exposed. GRANT EXECUTE to
  BOTH anon and authenticated (anon by design for pre-signup; reused later in
  authenticated profile-edit). Additive only: does not touch
  search_profiles_by_username, its grants, or any 028 table/policy. API-layer
  rate limiting on this now-anon-callable endpoint flagged in OUTSTANDING.md (not
  blocking). Verified against a local PG16: taken→false, available→true,
  malformed/null→false, exact-not-prefix, and called AS anon → succeeds (no
  Unauthorized). Applied and verified live 2026-07-23.
- 030_friend_connection_security.sql: hardens migration 028's relationship
  lifecycle. Authenticated clients retain participant-scoped SELECT but lose
  direct INSERT/UPDATE/DELETE; send_friend_request(uuid) and
  respond_to_friend_request(uuid,text) are the only authenticated mutation
  capabilities. Adds immutable participant fields, a database-enforced
  pending -> accepted/declined state machine, response timestamp consistency,
  idempotent outgoing sends, and a seven-day same-direction cooldown after a
  decline while preserving the declining person's ability to initiate the
  reverse request. Replaces get_profiles_by_ids(uuid[]) so it only hydrates
  self or the other party of a live pending/accepted edge. Added 2026-07-24;
  replayed with 028/029 and behavior-verified against disposable local PG16,
  then applied and verified live with the three-user security harness.
- 031_username_change_limit.sql: adds the owner-readable,
  trigger-write-only username_change_limits table and a SECURITY DEFINER
  profiles trigger that normalizes username updates and atomically allows at
  most three successful changes in any rolling seven-day window. Unchanged
  updates do not consume a change, and failed profile updates roll back the
  limiter write with the username update.
- 032_constellation_persistence.sql: adds owner-scoped, normalized
  constellation_nodes, constellation_edges, constellation_annotations, and
  constellation_evidence_links. Earned nodes and persisted system edges are
  authenticated-read-only; annotations retain invariant user/draft provenance
  and archive instead of direct deletion; Evidence Links keep their owner,
  Echo, and goal immutable while allowing Bud/Rose/Thorn category and a
  280-character trimmed note to be updated on the unique relation.
  Composite FKs enforce same-owner sources and explicit cascades, annotation
  anchors become null when a node disappears, every new table has RLS, and
  virtual BRT clusters remain unpersisted.
- 033_brt_category_unification_and_goal_anchor.sql: makes BRT category a
  per-entry field and adds a goal anchor path for annotations. Adds nullable
  echo_entries.brt_category (text, CHECK bud|rose|thorn) as the single-category
  source of truth; this is a NEW column, deliberately NOT echo_entries.brt_user
  (brt/brt_ai/brt_user remain the dormant, zero-data jsonb columns from 007's
  deferred AI-vs-user BRT-structure split, untouched here). Drops
  constellation_evidence_links.brt_category (0 rows, no backfill) and recreates
  its goal_lookup index on (owner_id, goal_id) so the dropped column doesn't
  silently delete the goal-scoped lookup path. Adds
  constellation_annotations.anchor_goal_id (composite FK to goals(id,user_id),
  ON DELETE SET NULL on the anchor column only via PG15+ column-list syntax so
  owner_id NOT NULL survives goal deletion), a num_nonnulls(...)<=1 single-anchor
  CHECK, a partial anchor-lookup index, and extends the same-owner anchor
  trigger to cover the new column. Applied via the Supabase management API query
  endpoint and behavior-verified live (same-owner insert, cross-owner rejection,
  goal-delete set-null) on 2026-07-29; types regenerated, tsc clean.
- 034_constellation_layout_positions.sql: stores owner-scoped Constellation
  placement preferences by selection key. Top-level nodes use bounded
  normalized canvas coordinates; goal satellites use bounded parent-relative
  offsets. The table has owner CRUD RLS, an owner/selection-key primary key,
  updated-at maintenance, and account-delete cascade. Current-node and
  coordinate-space semantics are additionally validated by the API. Verified
  with the disposable PostgreSQL Constellation security harness, applied to the
  linked OharaAI main project, and confirmed in the remote migration ledger on
  2026-07-29.
- 035_constellation_goal_links.sql: adds private owner-authored undirected
  goal-to-goal links in a table separate from system-managed
  constellation_edges. Canonical endpoint order and a unique unordered-pair
  index reject duplicates; composite goal FKs require same-owner endpoints and
  cascade on goal deletion; notes are trimmed and bounded to 1–280 characters;
  endpoints are immutable; an advisory-lock trigger enforces at most six user
  links per goal under concurrent inserts; and owner CRUD RLS protects every
  operation. Verified with the disposable PostgreSQL Constellation security
  harness on 2026-07-30. Not yet applied to the linked main project.
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
