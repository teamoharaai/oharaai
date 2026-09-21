# supabase/CLAUDE.md — Database & Migration Rules

Owner: CTO. Cascade Level 3.

## Migration Conventions
- supabase/migrations/ holds 6 narrative baseline files (001-006), squashed
  2026-06-24 from the original 26 incremental migrations. 007-039 were added
  after the squash (see below). Next new migration: 067.
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
- 036_entries_notes_reflections.sql: adds canonical owner-scoped Entries and
  their goal/category/milestone relationships, RLS, indexes, and transactional
  save/relationship functions.
- 037_fix_entry_category_link_source.sql: preserves the required category-link
  source during transactional relationship replacement.
- 038_momentum_foundation.sql: adds the private, immutable, versioned Momentum
  profile/event/snapshot foundation and service-role-only publication boundary.
- 039_restore_explicit_table_privileges.sql: restores an explicit per-table
  PostgREST privilege matrix for clean CLI resets without broad anon grants;
  retains capability-only friendship mutation and server-authoritative Momentum
  writes. Local-only as of 2026-08-03; not applied to a remote project.
- 044_echo_v1_project_links.sql: adds one nullable, owner-scoped Project folder
  relationship to canonical Entries and the atomic `save_entry_v3` wrapper.
  Existing Entries and legacy Echo rows are not backfilled or rewritten; full
  Projects Version 1.0 remains outside this migration's scope.
- 045_entries_brt_idempotent_create.sql: adds canonical nullable BRT storage and
  owner-scoped create idempotency to Entries. Its `save_entry_v4` wrapper delegates
  Project-aware V3 so native Reflection retries preserve the complete Echo contract.
- 046_tracker_logs_period_index.sql: adds the production-applied compound covering
  index used by legacy Tracker period reads and removes its redundant prefix index.
- 047_goal_lifecycle_foundation.sql: adds explicit Goal expiration, lifecycle
  timestamps, deadline history, same-ID extension, and atomic successor phases.
- 048_tasks_activity_foundation.sql: adds canonical Tasks, versioned schedules,
  durable occurrences, request receipts, and trusted owner-scoped mutation RPCs.
- 049_tasks_legacy_backfill.sql: preserves surviving Tracker/action history through
  idempotent provenance-backed Task and occurrence mappings without inferred data.
- 050_tasks_new_phase_continuity.sql: carries eligible active Task definitions and
  current schedules into atomic successor Goals without copying historical activity.
- 051_tasks_release_cutover_controls.sql: provides service-role catch-up and mapping
  verification, atomic authenticated legacy-write freeze, and narrow privilege restore.
- 052_milestones_kind_hierarchy_photo.sql: Milestones social layer Build 1
  (milestone kind, sub-milestone hierarchy, photos). Applied live. Owned by the
  Milestones initiative (`memory/project_milestones_social.md`).
- 053_circles_social_layer.sql: Circles friends-only social layer. Adds
  `goal_share_invites`, `circle_posts`, `post_encouragements`, `post_comments`,
  `saved_posts` (all RLS-enabled, cross-user writes RPC-only), the
  `goals_one_public_per_user` partial unique index, and 13 SECURITY DEFINER/
  INVOKER RPCs (`are_friends`, `set_public_goal`, invite send/respond/withdraw,
  the whitelisted `circles_goal_summary` + `get_viewable_goal`/`list_*` viewer
  reads, and `create_circle_post`/`delete_circle_post`/`get_circles_feed`).
  Privacy spine (CD-004): non-owners never read base tables — `circles_goal_summary`
  is revoked from `authenticated` and reachable only via the wrapper RPCs.
  Behavior-proven on a disposable local PG16 harness
  (`scripts/test-circles-security.sh`, `npm run test:circles:db`), then applied
  via the management API and verified live 2026-09-17
  (`design/circles/audits/001-migration-053-live-verify.md`). Types regenerated,
  tsc clean. Design: `design/circles/`.
- 054_circle_comment_soft_delete_rpc.sql: Circles Fix 0. Adds
  `delete_circle_comment(uuid)` SECURITY DEFINER (author-scoped via auth.uid(),
  idempotent, raise P0002 when missing; EXECUTE to authenticated) and DROPS the
  053 `post_comments` "Authors can soft delete own comments" UPDATE policy +
  `update (deleted_at)` grant. Fixes the live 403 42501 where the `deleted_at IS
  NULL` SELECT policy hid the post-update row so an author's own soft-delete UPDATE
  was rejected; now comments soft-delete via an RPC like `circle_posts` (CD-009,
  CD-021). Applied + verified live via the management API 2026-09-17 (rolled-back
  `set local role authenticated` sim + harness 053+054); types regenerated, tsc
  clean. Latest applied migration is now 054. Design: `design/circles/`.
- 055_retire_prep_milestones.sql: Goal Detail Redesign Phase 1. Deletes the
  legacy `prep` milestone rows (`delete from public.milestones where kind =
  'prep'`) — milestones become one-time achievements only; enabling/recurring
  work lives in Tasks. Scoped strictly to `kind = 'prep'`; the `kind` column +
  CHECK are intentionally left in place (pure data cleanup, no product path
  authors prep anymore). Deletes were FK-safe (tasks.milestone_id SET NULL,
  reflection_milestone_links + parent_id CASCADE). Applied + verified live via
  the management API 2026-09-18 (1 prep row removed, remaining_prep=0, ledger
  latest=055). `MilestoneKind` narrowed to `'achievement'`. Owned by the Goal
  Detail Redesign (`memory/project_goal_detail_redesign.md`,
  `design/goal-detail-redesign/`). Latest applied migration is now 055.
- 056_tasks_optional_counter_target.sql: Goal Detail Redesign Phase 2. Makes a
  quantity Task a true count-up counter — its target is now OPTIONAL (null target
  = just counts up), mirroring the optional `target_count` on milestone
  achievements. Relaxes the `source='user'` `tasks_check` constraint (quantity no
  longer requires target+unit; binary still forbids both; positivity stays on the
  separate `tasks_target_quantity_check`) and the matching guards in
  `create_task_v1` / `update_task_v1` / `log_completed_task_v1` (retroactive
  quantity completions still require a valid actual amount). Loosening a CHECK
  never invalidates existing rows — no backfill. Dry-run-verified in a rolled-back
  txn (null-target quantity insert accepted), then applied + verified live via the
  management API 2026-09-18 (constraint def confirmed relaxed, ledger latest=056).
  Owned by the Goal Detail Redesign. Latest applied migration is now 056.
- 057_todo_due_time.sql and 058_goal_sticky_notes.sql: applied live (present in the
  repo + ledger); not separately narrated in this changelog. Their features own the
  detail. Noted here only so the numbering below is unambiguous.
- 059_tasks_weekly_count_frequency.sql: To-Do × Metric Unification Phase 3 (TM-6).
  Adds flexible "N times a week" Task frequency: `task_schedules.target_count` +
  the `weekly_count` recurrence kind (weekdays empty, target_count 1..7), a
  `weekly_count` arm in `reconcile_task_occurrences_v1` (one ISO-week-anchored
  occurrence per week — anchored at greatest(week-Monday, start_date) — marked
  missed only once the whole week has elapsed, never mid-week), and
  `create_task_v1` (dropped/recreated at 18 args with `p_schedule_target_count`)
  forcing weekly_count Tasks to completion_mode='quantity' with target_quantity
  mirrored from target_count so the existing counter/adjust-quantity/progress
  mechanic drives per-week completion (1/3 → done). `update_task_v1` /
  `replace_task_schedule_v1` intentionally unchanged (daily/weekly-only); editing a
  weekly_count frequency in place is deferred (TaskForm shows it read-only). All
  additive — widened CHECKs + a nullable column never invalidate existing rows, no
  backfill. Weekly-count only (no monthly). Dry-run-verified in a rolled-back txn
  (5 correct one-per-week occurrences, all pending, no mid-week miss; rollback left
  nothing behind), then applied + verified live via the management API 2026-09-19
  (ledger latest=059, target_count column present, single create_task_v1 overload).
  Owned by the Goal Detail Redesign (`design/goal-detail-redesign/`). Latest applied
  migration is now 059.
- 060_new_phase_cadence_public_visibility.sql: preserves Task cadence and public
  visibility across Goal phase transitions. Owned by the Goal Detail Redesign;
  applied live (ledger). Feature-owned narrative lives with that initiative.
- 061_backfill_goal_vaults.sql: one-time idempotent backfill creating a personal
  vault for every existing vault-less goal. Vault auto-creation had been gated
  behind a vaultContext, so most goals had no `vaults` row and the Vault UI 404'd;
  goal creation now mints a vault unconditionally and the read path get-or-creates.
  Applied + verified live via the management API 2026-09-19 (vaults 9→53,
  goals_missing_vault 44→0). Owned by the Vaults revival.
- 062_unify_sticky_notes_into_vault.sql: makes `vault_items` the single canonical
  note store. Copies `goal_notes` (058) → `vault_items` (item_type='note',
  body→content, photo→metadata.photoUrl, created_at preserved; provenance keys for
  idempotency/rollback), then FREEZES `goal_notes` (revokes authenticated
  insert/update/delete; SELECT kept as a read-only rollback window). Slated for a
  later drop of the `goal_notes` table + `goal-note-photos` bucket once verified.
  Dry-run-verified in a rolled-back txn, then applied + verified live 2026-09-19
  (2 notes copied, fields matching, embedding_text seeded, authenticated INSERT
  revoked). Latest applied migration is now 062. Owned by the Vaults revival.
- 063_reconcile_occurrences_frontier_scan.sql: Momentum/Tasks read-path perf.
  Rewrites `reconcile_task_occurrences_v1` to lower-bound its occurrence
  generate_series at the materialization FRONTIER + 1 (day after the latest
  existing occurrence for the schedule) instead of `start_date`. Root cause found
  via EXPLAIN ANALYZE: the old body re-proposed every already-materialized day to
  the `BEFORE INSERT` `validate_task_occurrence_v1` trigger, whose
  `pg_timezone_names` timezone check costs ~112ms/row — so a ~36-occurrence task
  burned ~4s of trigger time on every reconcile (blowing the authenticated
  statement_timeout and 500-ing momentum + `/api/tasks`). Frontier+1 stops
  re-proposing existing rows; steady-state reconcile dropped ~2540ms → ~100ms
  (~25×). Correctness preserved: recurrence filters are start_date-anchored (matches
  unchanged), occurrences are insert-only with atomic inserts (no below-frontier
  gaps), and the status-only "mark missed" UPDATE doesn't match the trigger's
  UPDATE-OF column list. Function-body-only (same signature, no schema/type/RLS
  change), idempotent CREATE OR REPLACE. Verified live on real owner data (36 occ →
  contiguous span 36, correct 17-row forward materialization in a rolled-back txn),
  applied via the management API, ledger latest now 063. Deeper follow-up: optimize
  the `validate_task_occurrence_v1` `pg_timezone_names` scan itself (still taxes
  genuinely-new inserts / task creation) — deferred, broader blast radius. [Done in
  064.]
- 064_validate_occurrence_timezone_fast.sql: the 063 follow-up. Removes the
  per-row `pg_timezone_names` full-view scan (~112ms/row) from
  `validate_task_occurrence_v1` (the BEFORE INSERT/UPDATE-OF trigger on
  task_occurrences). Replaces the `not exists (select 1 from pg_timezone_names …)`
  timezone check with an O(1) `perform now() at time zone new.schedule_timezone`
  probe that rejects on SQLSTATE 22023 (invalid_parameter_value). This is the exact
  fitness-for-use criterion — schedule_timezone is only consumed by `at time zone`
  (task_local_instant_v1) — so it never scans the view and never drifts from live
  tzdata; marginally more permissive (also accepts abbreviations/offsets `at time
  zone` accepts) but the app only stores IANA names, so the accepted/rejected set is
  unchanged in practice. The two ownership checks are reproduced verbatim.
  Function-body only (same trigger/signature, no schema/type/RLS change), idempotent
  CREATE OR REPLACE. Verified live: the validate trigger dropped 4055ms→30ms across a
  36-row insert (~135×), the full insert 5005ms→99ms; behavior intact (valid tz
  accepted, invalid tz raises 'Occurrence timezone must be a valid IANA timezone',
  cross-owner still rejected — all in rolled-back txns). Applied via the management
  API; ledger latest now 064.
- 065_vault_note_folders.sql: per-goal Sticky Note folders. Adds
  `vault_note_folders` (vault-scoped, owner RLS, unique lower(name) per vault) and
  a nullable `vault_items.folder_id` FK with ON DELETE SET NULL (NULL = the
  virtual "General" bucket; deleting a folder reassigns its notes to General, no
  RPC). Only note-type items use folder_id. Applied via management API.
- 066_harden_note_folder_vault_ownership.sql: tightens `vault_note_folders`
  INSERT/UPDATE with-check to also require ownership of the referenced vault (so a
  folder can only live in a vault the caller owns; closes a raw-PostgREST path
  that let an inert folder row point at another vault). Applied via management
  API; ledger latest now 066. Owned by the Sticky Note folders feature.
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
