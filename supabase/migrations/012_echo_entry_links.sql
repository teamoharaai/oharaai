-- ============================================================================
-- 012_echo_entry_links.sql
-- Generalizes echo_goal_links into echo_entry_links: a single bridge table
-- supporting multiple container types (goal | folder), ahead of the
-- upcoming Echo Folders feature. Zero production data at time of writing
-- (pre-pilot) — this is a pure schema restructuring, not a live-data
-- migration, so no data-preservation ceremony beyond the backfill below.
--
-- folder_id has NO foreign key constraint yet: the Echo Folders table does
-- not exist as of this migration. A future migration must add
-- `references public.echo_folders(id) on delete cascade` (or equivalent)
-- once that table is created.
-- ============================================================================

alter table public.echo_goal_links rename to echo_entry_links;

alter index echo_goal_links_pkey rename to echo_entry_links_pkey;
alter index echo_goal_links_echo_entry_id_idx rename to echo_entry_links_echo_entry_id_idx;
alter index echo_goal_links_goal_id_idx rename to echo_entry_links_goal_id_idx;
alter table public.echo_entry_links
  rename constraint echo_goal_links_echo_entry_id_goal_id_key
  to echo_entry_links_echo_entry_id_goal_id_key;

-- container_type: added nullable, backfilled, then locked down. Backfill is
-- a no-op today (zero/near-zero existing rows) but is written explicitly for
-- correctness/documentation, and in case this baseline is ever applied
-- against an environment that already has rows.
alter table public.echo_entry_links add column container_type text;
update public.echo_entry_links set container_type = 'goal' where container_type is null;
alter table public.echo_entry_links alter column container_type set not null;
alter table public.echo_entry_links add constraint echo_entry_links_container_type_check
  check (container_type in ('goal', 'folder'));

-- goal_id becomes optional; folder_id added (nullable, no FK — see header).
alter table public.echo_entry_links alter column goal_id drop not null;
alter table public.echo_entry_links add column folder_id uuid;

create index echo_entry_links_folder_id_idx on public.echo_entry_links (folder_id);

-- Exactly one of goal_id / folder_id must be set, matching container_type.
alter table public.echo_entry_links add constraint echo_entry_links_container_match_check
  check (
    (container_type = 'goal' and goal_id is not null and folder_id is null)
    or
    (container_type = 'folder' and folder_id is not null and goal_id is null)
  );

-- Dedup constraints, one per container. Each is a plain (non-partial) unique
-- constraint on (echo_entry_id, <container column>) — NOT a single composite
-- constraint across both columns. A composite (echo_entry_id, container_type,
-- goal_id, folder_id) unique constraint would NOT work here: per SQL NULL
-- semantics, NULL is never equal to NULL, so with folder_id always NULL on
-- goal-type rows (and vice versa), such a constraint would silently fail to
-- catch duplicate goal-links. Two separate plain unique constraints avoid
-- this pitfall entirely, since within each constraint the relevant column is
-- guaranteed non-null by echo_entry_links_container_match_check above.
--
-- The (echo_entry_id, goal_id) constraint already existed pre-generalization
-- (renamed above) and continues to work unchanged: folder-type rows always
-- have goal_id = NULL, so they never collide with it.
alter table public.echo_entry_links add constraint echo_entry_links_echo_entry_id_folder_id_key
  unique (echo_entry_id, folder_id);

-- RLS: no changes needed. Renaming a table in Postgres does not drop or
-- detach its policies (they're tied to the table's OID, not its name), so
-- the four existing "Users can ... echo links" policies carry over as-is
-- and keep enforcing ownership via echo_entries.user_id = auth.uid(). That
-- check is container-agnostic — it never referenced goal_id — so it applies
-- correctly to folder-type rows with zero modification required.
