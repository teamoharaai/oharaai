-- ============================================================================
-- 039_restore_explicit_table_privileges.sql
-- Restores the explicit PostgREST table privileges implied by the final RLS
-- and capability model. Clean CLI resets execute repository migrations as the
-- postgres role, whose local default ACL does not grant client CRUD.
--
-- This migration intentionally does not grant table access to anon, does not
-- disable RLS, and does not use GRANT ALL ON ALL TABLES. Each authenticated
-- privilege below is paired with an existing final-state RLS policy or an
-- explicitly retained read-only capability. Migration 030's direct friendship
-- mutation lock-down and Migration 038's server-authoritative Momentum writes
-- remain intact.
-- ============================================================================

-- Standard owner-scoped CRUD surfaces.
grant select, insert, update, delete on table
  public.goals,
  public.milestones,
  public.trackers,
  public.tracker_logs,
  public.interests,
  public.echo_sessions,
  public.echo_entries,
  public.spaces,
  public.space_members,
  public.projects,
  public.vaults,
  public.vault_items,
  public.echo_entry_links,
  public.echo_folders,
  public.entries,
  public.constellation_evidence_links,
  public.constellation_layout_positions,
  public.constellation_goal_links
to authenticated;

-- Profiles are intentionally non-deletable by authenticated clients.
grant select, insert, update on table public.profiles to authenticated;

-- Action logs and draft annotations archive through UPDATE, not DELETE.
grant select, insert, update on table
  public.action_logs,
  public.constellation_annotations
to authenticated;

-- Append-only/read-only event surfaces.
grant select, insert on table public.echo_session_events to authenticated;

-- Relationship link tables are replaced by insert/delete operations and do
-- not expose direct updates.
grant select, insert, delete on table
  public.entry_goal_links,
  public.entry_category_links,
  public.reflection_milestone_links
to authenticated;

-- Invite records are created and read by their owner; lifecycle changes occur
-- through the reviewed capability functions.
grant select, insert on table public.invite_links to authenticated;

-- Explicitly read-only client surfaces. Direct friend mutations remain
-- revoked by Migration 030; system Constellation rows and Momentum writes are
-- server-managed; quota/username state is read-only.
grant select on table
  public.daily_ai_usage,
  public.friend_connections,
  public.username_change_limits,
  public.constellation_nodes,
  public.constellation_edges,
  public.momentum_profiles,
  public.momentum_events,
  public.momentum_weekly_snapshots
to authenticated;

-- The server-only service role requires explicit data access when migrations
-- are replayed under PostgreSQL defaults that do not grant it automatically.
-- RLS bypass and table constraints/triggers still enforce immutable and
-- structural invariants, including Momentum snapshot immutability.
grant select, insert, update, delete on table
  public.profiles,
  public.goals,
  public.milestones,
  public.trackers,
  public.tracker_logs,
  public.interests,
  public.echo_sessions,
  public.echo_entries,
  public.spaces,
  public.space_members,
  public.projects,
  public.vaults,
  public.vault_items,
  public.echo_entry_links,
  public.action_logs,
  public.daily_ai_usage,
  public.ai_usage,
  public.echo_folders,
  public.echo_session_events,
  public.friend_connections,
  public.invite_links,
  public.username_change_limits,
  public.constellation_nodes,
  public.constellation_edges,
  public.constellation_annotations,
  public.constellation_evidence_links,
  public.constellation_layout_positions,
  public.constellation_goal_links,
  public.entries,
  public.entry_goal_links,
  public.entry_category_links,
  public.reflection_milestone_links,
  public.momentum_profiles,
  public.momentum_events,
  public.momentum_weekly_snapshots
to service_role;

-- Defense-in-depth assertions: later privilege work must not accidentally
-- restore the direct mutation capabilities deliberately removed earlier.
revoke insert, update, delete on table public.friend_connections from authenticated;
revoke insert, update, delete on table
  public.momentum_profiles,
  public.momentum_events,
  public.momentum_weekly_snapshots
from authenticated;
