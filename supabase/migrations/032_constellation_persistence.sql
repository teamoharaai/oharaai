-- ============================================================================
-- 032_constellation_persistence.sql
-- Persists the approved Constellation decision contract without adding any
-- UI/API behavior. Bud/Rose/Thorn clusters remain derived read models and are
-- intentionally absent from this schema.
-- ============================================================================

-- Composite source keys let Constellation enforce owner alignment with real
-- source rows using foreign keys, including for service-role writes that bypass
-- RLS. The source tables already have UUID primary keys, so these constraints
-- are additive and cannot reject existing data.
alter table public.projects
  add constraint projects_id_user_id_key unique (id, user_id);

alter table public.goals
  add constraint goals_id_user_id_key unique (id, user_id);

alter table public.echo_entries
  add constraint echo_entries_id_user_id_key unique (id, user_id);

-- Earned/system nodes --------------------------------------------------------
create table public.constellation_nodes (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  kind                text not null,
  status              text not null default 'active',
  season_id           uuid,
  label               text not null,
  description         text,
  authorship          text not null default 'system',
  is_earned           boolean not null default true,
  source_type         text not null,
  source_project_id   uuid,
  source_goal_id      uuid,
  source_profile_id   uuid references auth.users(id) on delete cascade,
  source_key          text,
  visibility_score    numeric,
  first_seen_at       timestamptz,
  last_activity_at    timestamptz,
  archived_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint constellation_nodes_id_owner_id_key unique (id, owner_id),
  constraint constellation_nodes_kind_check
    check (kind in ('season', 'ambition', 'goal', 'reflection', 'trait', 'tension')),
  constraint constellation_nodes_status_check
    check (status in ('active', 'archived')),
  constraint constellation_nodes_system_authorship_check
    check (authorship = 'system' and is_earned = true),
  constraint constellation_nodes_label_check
    check (char_length(btrim(label)) between 1 and 120),
  constraint constellation_nodes_source_type_check
    check (source_type in ('season', 'project', 'goal', 'candidate', 'character_profile')),
  constraint constellation_nodes_source_key_check
    check (
      source_key is null
      or (source_key = btrim(source_key) and char_length(source_key) between 1 and 200)
    ),
  constraint constellation_nodes_visibility_score_check
    check (visibility_score is null or visibility_score >= 0),
  constraint constellation_nodes_archive_state_check
    check (
      (status = 'active' and archived_at is null)
      or (status = 'archived' and archived_at is not null)
    ),
  constraint constellation_nodes_source_shape_check
    check (
      (
        kind = 'season'
        and source_type = 'season'
        and source_project_id is null
        and source_goal_id is null
        and source_profile_id is null
        and source_key is not null
      )
      or (
        kind = 'ambition'
        and source_type = 'project'
        and source_project_id is not null
        and source_goal_id is null
        and source_profile_id is null
        and source_key is null
      )
      or (
        kind = 'goal'
        and source_type = 'goal'
        and source_project_id is null
        and source_goal_id is not null
        and source_profile_id is null
        and source_key is null
      )
      or (
        kind in ('reflection', 'tension')
        and source_type = 'candidate'
        and source_project_id is null
        and source_goal_id is null
        and source_profile_id is null
        and source_key is not null
      )
      or (
        kind = 'trait'
        and source_type = 'character_profile'
        and source_project_id is null
        and source_goal_id is null
        and source_profile_id = owner_id
        and source_key is not null
      )
    ),
  constraint constellation_nodes_season_id_fkey
    foreign key (season_id)
    references public.constellation_nodes(id)
    on delete set null,
  constraint constellation_nodes_source_project_fkey
    foreign key (source_project_id, owner_id)
    references public.projects(id, user_id)
    on delete cascade,
  constraint constellation_nodes_source_goal_fkey
    foreign key (source_goal_id, owner_id)
    references public.goals(id, user_id)
    on delete cascade
);

create unique index constellation_nodes_one_active_season_per_owner_idx
  on public.constellation_nodes (owner_id)
  where status = 'active' and kind = 'season';

create unique index constellation_nodes_one_active_project_source_idx
  on public.constellation_nodes (source_project_id)
  where status = 'active' and source_project_id is not null;

create unique index constellation_nodes_one_active_goal_source_idx
  on public.constellation_nodes (source_goal_id)
  where status = 'active' and source_goal_id is not null;

create unique index constellation_nodes_one_active_keyed_source_idx
  on public.constellation_nodes (owner_id, source_type, source_key)
  where status = 'active' and source_key is not null;

create index constellation_nodes_owner_status_season_idx
  on public.constellation_nodes (owner_id, status, season_id);

create index constellation_nodes_source_project_lookup_idx
  on public.constellation_nodes (owner_id, source_project_id)
  where source_project_id is not null;

create index constellation_nodes_source_goal_lookup_idx
  on public.constellation_nodes (owner_id, source_goal_id)
  where source_goal_id is not null;

create index constellation_nodes_source_key_lookup_idx
  on public.constellation_nodes (owner_id, source_type, source_key)
  where source_key is not null;

create trigger constellation_nodes_updated_at
  before update on public.constellation_nodes
  for each row execute function public.handle_updated_at();

create or replace function public.validate_constellation_node_season()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind = 'season' and new.season_id is not null then
    raise exception using
      errcode = '23514',
      message = 'constellation season nodes cannot belong to another season';
  end if;

  if new.season_id is not null and not exists (
    select 1
    from public.constellation_nodes season
    where season.id = new.season_id
      and season.owner_id = new.owner_id
      and season.kind = 'season'
  ) then
    raise exception using
      errcode = '23514',
      message = 'constellation season must belong to the same owner and be a season node';
  end if;

  return new;
end;
$$;

create trigger constellation_nodes_validate_season
  before insert or update of season_id, owner_id, kind
  on public.constellation_nodes
  for each row execute function public.validate_constellation_node_season();

alter table public.constellation_nodes enable row level security;

-- Earned nodes are system-managed. Authenticated users can read their own
-- graph but cannot directly create, rewrite, archive, or delete earned nodes.
create policy "Users can read own constellation nodes"
  on public.constellation_nodes
  for select
  using (owner_id = auth.uid());

-- System edges --------------------------------------------------------------
create table public.constellation_edges (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  source_node_id      uuid not null,
  target_node_id      uuid not null,
  kind                text not null,
  valence             text,
  weight              numeric,
  status              text not null default 'active',
  last_activity_at    timestamptz,
  archived_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint constellation_edges_distinct_nodes_check
    check (source_node_id <> target_node_id),
  constraint constellation_edges_kind_check
    check (
      kind in (
        'season_membership',
        'ambition_goal',
        'goal_pattern',
        'pattern_cooccurrence',
        'trait_derivation',
        'tension_composition'
      )
    ),
  constraint constellation_edges_valence_check
    check (
      valence is null
      or valence in ('positive', 'negative', 'neutral', 'mixed', 'contradictory')
    ),
  constraint constellation_edges_weight_check
    check (weight is null or (weight >= 0 and weight <= 15)),
  constraint constellation_edges_status_check
    check (status in ('active', 'archived')),
  constraint constellation_edges_archive_state_check
    check (
      (status = 'active' and archived_at is null)
      or (status = 'archived' and archived_at is not null)
    ),
  constraint constellation_edges_source_node_fkey
    foreign key (source_node_id, owner_id)
    references public.constellation_nodes(id, owner_id)
    on delete cascade,
  constraint constellation_edges_target_node_fkey
    foreign key (target_node_id, owner_id)
    references public.constellation_nodes(id, owner_id)
    on delete cascade
);

create unique index constellation_edges_one_active_relationship_idx
  on public.constellation_edges (
    owner_id,
    kind,
    least(source_node_id, target_node_id),
    greatest(source_node_id, target_node_id)
  )
  where status = 'active';

create index constellation_edges_source_graph_read_idx
  on public.constellation_edges (owner_id, status, source_node_id);

create index constellation_edges_target_graph_read_idx
  on public.constellation_edges (owner_id, status, target_node_id);

create trigger constellation_edges_updated_at
  before update on public.constellation_edges
  for each row execute function public.handle_updated_at();

alter table public.constellation_edges enable row level security;

-- Like nodes, persisted graph edges are system-managed and owner-readable.
-- annotation_anchor and goal_evidence_cluster are derived edges, so their
-- kinds are deliberately excluded from the persisted-edge CHECK above.
create policy "Users can read own constellation edges"
  on public.constellation_edges
  for select
  using (owner_id = auth.uid());

-- User-authored annotations -------------------------------------------------
create table public.constellation_annotations (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid not null references auth.users(id) on delete cascade,
  kind                     text not null,
  status                   text not null default 'draft',
  authorship               text not null default 'user',
  is_draft                 boolean not null default true,
  label                    text not null,
  body                     text,
  anchor_earned_node_id    uuid references public.constellation_nodes(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  archived_at              timestamptz,

  constraint constellation_annotations_kind_check
    check (kind in ('note', 'projection')),
  constraint constellation_annotations_status_check
    check (status in ('draft', 'archived')),
  constraint constellation_annotations_user_draft_check
    check (authorship = 'user' and is_draft = true),
  constraint constellation_annotations_label_check
    check (char_length(btrim(label)) between 1 and 120),
  constraint constellation_annotations_archive_state_check
    check (
      (status = 'draft' and archived_at is null)
      or (status = 'archived' and archived_at is not null)
    )
);

create index constellation_annotations_owner_status_idx
  on public.constellation_annotations (owner_id, status, updated_at desc);

create index constellation_annotations_anchor_lookup_idx
  on public.constellation_annotations (owner_id, anchor_earned_node_id)
  where anchor_earned_node_id is not null;

create or replace function public.validate_constellation_annotation_anchor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.anchor_earned_node_id is not null and not exists (
    select 1
    from public.constellation_nodes node
    where node.id = new.anchor_earned_node_id
      and node.owner_id = new.owner_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'constellation annotation anchor must belong to the same owner';
  end if;

  return new;
end;
$$;

create trigger constellation_annotations_validate_anchor
  before insert or update of anchor_earned_node_id, owner_id
  on public.constellation_annotations
  for each row execute function public.validate_constellation_annotation_anchor();

create or replace function public.handle_constellation_annotation_archive()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'archived' and new.status <> 'archived' then
    raise exception using
      errcode = '23514',
      message = 'archived constellation annotations cannot be restored';
  end if;

  if old.status = 'draft' and new.status = 'archived' then
    new.archived_at = coalesce(new.archived_at, now());
  end if;

  return new;
end;
$$;

create trigger constellation_annotations_archive_lifecycle
  before update of status on public.constellation_annotations
  for each row execute function public.handle_constellation_annotation_archive();

create trigger constellation_annotations_updated_at
  before update on public.constellation_annotations
  for each row execute function public.handle_updated_at();

alter table public.constellation_annotations enable row level security;

create policy "Users can read own constellation annotations"
  on public.constellation_annotations
  for select
  using (owner_id = auth.uid());

create policy "Users can create own draft constellation annotations"
  on public.constellation_annotations
  for insert
  with check (
    owner_id = auth.uid()
    and status = 'draft'
    and authorship = 'user'
    and is_draft = true
    and (
      anchor_earned_node_id is null
      or exists (
        select 1
        from public.constellation_nodes node
        where node.id = anchor_earned_node_id
          and node.owner_id = auth.uid()
      )
    )
  );

-- Archived annotations remain readable but immutable. Updating a draft to
-- archived is allowed because USING evaluates the old row.
create policy "Users can edit or archive own draft constellation annotations"
  on public.constellation_annotations
  for update
  using (owner_id = auth.uid() and status = 'draft')
  with check (
    owner_id = auth.uid()
    and authorship = 'user'
    and is_draft = true
    and (
      anchor_earned_node_id is null
      or exists (
        select 1
        from public.constellation_nodes node
        where node.id = anchor_earned_node_id
          and node.owner_id = auth.uid()
      )
    )
  );

-- No authenticated DELETE policy: archival is the product removal path.
-- Account erasure still cascades from auth.users through owner_id.

-- Manual Echo-to-goal evidence references ----------------------------------
create table public.constellation_evidence_links (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  echo_entry_id   uuid not null,
  goal_id         uuid not null,
  brt_category    text not null,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint constellation_evidence_links_echo_goal_key
    unique (echo_entry_id, goal_id),
  constraint constellation_evidence_links_brt_category_check
    check (brt_category in ('bud', 'rose', 'thorn')),
  constraint constellation_evidence_links_note_check
    check (
      note is null
      or (
        note = btrim(note)
        and char_length(note) between 1 and 280
      )
    ),
  constraint constellation_evidence_links_echo_owner_fkey
    foreign key (echo_entry_id, owner_id)
    references public.echo_entries(id, user_id)
    on delete cascade,
  constraint constellation_evidence_links_goal_owner_fkey
    foreign key (goal_id, owner_id)
    references public.goals(id, user_id)
    on delete cascade
);

create index constellation_evidence_links_owner_idx
  on public.constellation_evidence_links (owner_id, created_at desc);

create index constellation_evidence_links_goal_lookup_idx
  on public.constellation_evidence_links (owner_id, goal_id, brt_category);

create index constellation_evidence_links_echo_lookup_idx
  on public.constellation_evidence_links (owner_id, echo_entry_id);

create or replace function public.protect_constellation_evidence_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id <> old.owner_id
    or new.echo_entry_id <> old.echo_entry_id
    or new.goal_id <> old.goal_id then
    raise exception using
      errcode = '23514',
      message = 'constellation evidence owner, Echo, and goal are immutable';
  end if;

  return new;
end;
$$;

create trigger constellation_evidence_links_protect_identity
  before update of owner_id, echo_entry_id, goal_id
  on public.constellation_evidence_links
  for each row execute function public.protect_constellation_evidence_identity();

create trigger constellation_evidence_links_updated_at
  before update on public.constellation_evidence_links
  for each row execute function public.handle_updated_at();

alter table public.constellation_evidence_links enable row level security;

create policy "Users can read own constellation evidence links"
  on public.constellation_evidence_links
  for select
  using (owner_id = auth.uid());

create policy "Users can create own constellation evidence links"
  on public.constellation_evidence_links
  for insert
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.echo_entries entry
      where entry.id = echo_entry_id
        and entry.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.goals goal
      where goal.id = goal_id
        and goal.user_id = auth.uid()
    )
  );

create policy "Users can update own constellation evidence links"
  on public.constellation_evidence_links
  for update
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.echo_entries entry
      where entry.id = echo_entry_id
        and entry.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.goals goal
      where goal.id = goal_id
        and goal.user_id = auth.uid()
    )
  );

create policy "Users can delete own constellation evidence links"
  on public.constellation_evidence_links
  for delete
  using (owner_id = auth.uid());

comment on table public.constellation_nodes is
  'System-managed earned Constellation nodes. Virtual BRT clusters are never stored here.';

comment on table public.constellation_edges is
  'System-managed persisted graph edges. Annotation and BRT-cluster edges are derived on read.';

comment on table public.constellation_annotations is
  'User-authored draft note/projection content, structurally separate from earned nodes.';

comment on table public.constellation_evidence_links is
  'Manual Echo-to-goal BRT evidence organization; independent of echo_entry_links and brt_user.';
