\set ON_ERROR_STOP on

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

insert into auth.users (id)
values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

insert into public.projects (id, user_id, title)
values
  ('10000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000000a', 'A project'),
  ('10000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-00000000000b', 'B project');

insert into public.goals (id, user_id, title)
values
  ('20000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000000a', 'A primary goal'),
  ('20000000-0000-4000-8000-00000000002a', '00000000-0000-4000-8000-00000000000a', 'A deletion goal'),
  ('20000000-0000-4000-8000-00000000003a', '00000000-0000-4000-8000-00000000000a', 'A linked goal 3'),
  ('20000000-0000-4000-8000-00000000004a', '00000000-0000-4000-8000-00000000000a', 'A linked goal 4'),
  ('20000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-00000000000a', 'A linked goal 5'),
  ('20000000-0000-4000-8000-00000000006a', '00000000-0000-4000-8000-00000000000a', 'A linked goal 6'),
  ('20000000-0000-4000-8000-00000000007a', '00000000-0000-4000-8000-00000000000a', 'A linked goal 7'),
  ('20000000-0000-4000-8000-00000000008a', '00000000-0000-4000-8000-00000000000a', 'A limit goal'),
  ('20000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-00000000000b', 'B goal'),
  ('20000000-0000-4000-8000-00000000002b', '00000000-0000-4000-8000-00000000000b', 'B second goal');

insert into public.echo_entries (id, user_id, content)
values
  ('30000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000000a', 'A primary Echo'),
  ('30000000-0000-4000-8000-00000000002a', '00000000-0000-4000-8000-00000000000a', 'A Echo deleted later'),
  ('30000000-0000-4000-8000-00000000003a', '00000000-0000-4000-8000-00000000000a', 'A Echo preserved after goal deletion'),
  ('30000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-00000000000b', 'B Echo');

insert into public.echo_entry_links (id, echo_entry_id, goal_id, confirmed)
values (
  '40000000-0000-4000-8000-00000000001a',
  '30000000-0000-4000-8000-00000000001a',
  '20000000-0000-4000-8000-00000000001a',
  true
);

insert into public.constellation_nodes (
  id,
  owner_id,
  kind,
  season_id,
  label,
  source_type,
  source_project_id,
  source_goal_id,
  source_key
)
values
  (
    '50000000-0000-4000-8000-00000000001a',
    '00000000-0000-4000-8000-00000000000a',
    'season',
    null,
    'A current season',
    'season',
    null,
    null,
    'season:a:current'
  ),
  (
    '50000000-0000-4000-8000-00000000002a',
    '00000000-0000-4000-8000-00000000000a',
    'goal',
    '50000000-0000-4000-8000-00000000001a',
    'A primary goal node',
    'goal',
    null,
    '20000000-0000-4000-8000-00000000001a',
    null
  ),
  (
    '50000000-0000-4000-8000-00000000003a',
    '00000000-0000-4000-8000-00000000000a',
    'reflection',
    '50000000-0000-4000-8000-00000000001a',
    'A reflection',
    'candidate',
    null,
    null,
    'candidate:a:reflection'
  ),
  (
    '50000000-0000-4000-8000-00000000004a',
    '00000000-0000-4000-8000-00000000000a',
    'goal',
    '50000000-0000-4000-8000-00000000001a',
    'A deletion goal node',
    'goal',
    null,
    '20000000-0000-4000-8000-00000000002a',
    null
  ),
  (
    '50000000-0000-4000-8000-00000000005a',
    '00000000-0000-4000-8000-00000000000a',
    'ambition',
    '50000000-0000-4000-8000-00000000001a',
    'A ambition',
    'project',
    '10000000-0000-4000-8000-00000000001a',
    null,
    null
  ),
  (
    '50000000-0000-4000-8000-00000000001b',
    '00000000-0000-4000-8000-00000000000b',
    'season',
    null,
    'B current season',
    'season',
    null,
    null,
    'season:b:current'
  ),
  (
    '50000000-0000-4000-8000-00000000002b',
    '00000000-0000-4000-8000-00000000000b',
    'goal',
    '50000000-0000-4000-8000-00000000001b',
    'B goal node',
    'goal',
    null,
    '20000000-0000-4000-8000-00000000001b',
    null
  );

insert into public.constellation_edges (
  id,
  owner_id,
  source_node_id,
  target_node_id,
  kind,
  weight
)
values
  (
    '60000000-0000-4000-8000-00000000001a',
    '00000000-0000-4000-8000-00000000000a',
    '50000000-0000-4000-8000-00000000001a',
    '50000000-0000-4000-8000-00000000002a',
    'season_membership',
    1
  ),
  (
    '60000000-0000-4000-8000-00000000002a',
    '00000000-0000-4000-8000-00000000000a',
    '50000000-0000-4000-8000-00000000001a',
    '50000000-0000-4000-8000-00000000004a',
    'season_membership',
    1
  ),
  (
    '60000000-0000-4000-8000-00000000001b',
    '00000000-0000-4000-8000-00000000000b',
    '50000000-0000-4000-8000-00000000001b',
    '50000000-0000-4000-8000-00000000002b',
    'season_membership',
    1
  );

\echo 'Checking schema invariants and source uniqueness...'

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_nodes (
      owner_id,
      kind,
      season_id,
      label,
      source_type,
      source_goal_id
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      'goal',
      '50000000-0000-4000-8000-00000000001a',
      'Duplicate active goal source',
      'goal',
      '20000000-0000-4000-8000-00000000001a'
    );
  exception
    when unique_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'duplicate active source-backed node was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_nodes (
      owner_id,
      kind,
      label,
      source_type,
      source_key
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      'bud',
      'Persisted virtual Bud',
      'season',
      'virtual:bud'
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'virtual BRT node kind was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_edges (
      owner_id,
      source_node_id,
      target_node_id,
      kind
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '50000000-0000-4000-8000-00000000001a',
      '50000000-0000-4000-8000-00000000003a',
      'goal_evidence_cluster'
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'derived BRT cluster edge was persisted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_annotations (
      owner_id,
      kind,
      status,
      label
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      'note',
      'earned',
      'Invalid status'
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'invalid annotation status was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_annotations (
      owner_id,
      kind,
      authorship,
      label
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      'note',
      'system',
      'Masquerading annotation'
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'annotation masqueraded as system-earned content';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.constellation_brt_clusters') is not null then
    raise exception 'virtual BRT clusters were persisted as a table';
  end if;
end;
$$;

\echo 'Creating owner B rows through RLS...'

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000b';

insert into public.constellation_annotations (
  id,
  owner_id,
  kind,
  label,
  anchor_earned_node_id
)
values (
  '70000000-0000-4000-8000-00000000001b',
  '00000000-0000-4000-8000-00000000000b',
  'projection',
  'B private projection',
  '50000000-0000-4000-8000-00000000002b'
);

insert into public.constellation_evidence_links (
  id,
  owner_id,
  echo_entry_id,
  goal_id,
  brt_category,
  note
)
values (
  '80000000-0000-4000-8000-00000000001b',
  '00000000-0000-4000-8000-00000000000b',
  '30000000-0000-4000-8000-00000000001b',
  '20000000-0000-4000-8000-00000000001b',
  'rose',
  null
);

insert into public.constellation_layout_positions (
  owner_id,
  selection_key,
  coordinate_space,
  x,
  y
)
values (
  '00000000-0000-4000-8000-00000000000b',
  'node:20000000-0000-4000-8000-00000000001b',
  'canvas',
  0.4,
  0.6
);

insert into public.constellation_goal_links (
  id,
  owner_id,
  source_goal_id,
  target_goal_id,
  note
)
values (
  '90000000-0000-4000-8000-00000000001b',
  '00000000-0000-4000-8000-00000000000b',
  '20000000-0000-4000-8000-00000000001b',
  '20000000-0000-4000-8000-00000000002b',
  'B private relationship'
);

\echo 'Checking owner A writes, archival, and RLS isolation...'

set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a';

insert into public.constellation_layout_positions (
  owner_id,
  selection_key,
  coordinate_space,
  x,
  y
)
values (
  '00000000-0000-4000-8000-00000000000a',
  'node:20000000-0000-4000-8000-00000000001a',
  'canvas',
  0.3,
  0.7
);

do $$
declare
  rejected boolean := false;
begin
  if exists (
    select 1
    from public.constellation_layout_positions
    where owner_id = '00000000-0000-4000-8000-00000000000b'
  ) then
    raise exception 'cross-user layout read leaked through RLS';
  end if;

  begin
    insert into public.constellation_layout_positions (
      owner_id,
      selection_key,
      coordinate_space,
      x,
      y
    )
    values (
      '00000000-0000-4000-8000-00000000000b',
      'node:forged-by-a',
      'canvas',
      0.5,
      0.5
    );
  exception
    when insufficient_privilege then rejected := true;
  end;

  if not rejected then
    raise exception 'authenticated user forged another owner layout row';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_layout_positions (
      owner_id,
      selection_key,
      coordinate_space,
      x,
      y
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      'node:outside-canvas',
      'canvas',
      1.5,
      0.5
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'layout coordinate constraint accepted an invalid canvas point';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_nodes (
      owner_id,
      kind,
      label,
      source_type,
      source_key
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      'reflection',
      'Forged earned node',
      'candidate',
      'candidate:forged'
    );
  exception
    when insufficient_privilege then rejected := true;
  end;

  if not rejected then
    raise exception 'authenticated user inserted a system-managed earned node';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_edges (
      owner_id,
      source_node_id,
      target_node_id,
      kind
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '50000000-0000-4000-8000-00000000002a',
      '50000000-0000-4000-8000-00000000003a',
      'goal_pattern'
    );
  exception
    when insufficient_privilege then rejected := true;
  end;

  if not rejected then
    raise exception 'authenticated user inserted a system-managed edge';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from public.constellation_nodes
    where owner_id = '00000000-0000-4000-8000-00000000000b'
  ) then
    raise exception 'cross-user node read leaked through RLS';
  end if;

  if exists (
    select 1 from public.constellation_edges
    where owner_id = '00000000-0000-4000-8000-00000000000b'
  ) then
    raise exception 'cross-user edge read leaked through RLS';
  end if;

  if exists (
    select 1 from public.constellation_annotations
    where owner_id = '00000000-0000-4000-8000-00000000000b'
  ) then
    raise exception 'cross-user annotation read leaked through RLS';
  end if;

  if exists (
    select 1 from public.constellation_evidence_links
    where owner_id = '00000000-0000-4000-8000-00000000000b'
  ) then
    raise exception 'cross-user evidence read leaked through RLS';
  end if;

  if exists (
    select 1 from public.constellation_goal_links
    where owner_id = '00000000-0000-4000-8000-00000000000b'
  ) then
    raise exception 'cross-user goal-link read leaked through RLS';
  end if;
end;
$$;

\echo 'Checking user-authored goal-link constraints, notes, limits, and isolation...'

insert into public.constellation_goal_links (
  id,
  owner_id,
  source_goal_id,
  target_goal_id,
  note
)
values (
  '90000000-0000-4000-8000-00000000001a',
  '00000000-0000-4000-8000-00000000000a',
  '20000000-0000-4000-8000-00000000001a',
  '20000000-0000-4000-8000-00000000002a',
  'A private relationship'
);

update public.constellation_goal_links
set note = 'A revised private relationship'
where id = '90000000-0000-4000-8000-00000000001a';

do $$
declare
  rejected boolean := false;
begin
  if not exists (
    select 1
    from public.constellation_goal_links
    where id = '90000000-0000-4000-8000-00000000001a'
      and note = 'A revised private relationship'
  ) then
    raise exception 'owned goal-link note update was not persisted';
  end if;

  begin
    update public.constellation_goal_links
    set target_goal_id = '20000000-0000-4000-8000-00000000003a'
    where id = '90000000-0000-4000-8000-00000000001a';
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'goal-link identity update was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_goal_links (
      owner_id,
      source_goal_id,
      target_goal_id,
      note
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000001a',
      '20000000-0000-4000-8000-00000000001a',
      'Self link'
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'goal self-link was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_goal_links (
      owner_id,
      source_goal_id,
      target_goal_id,
      note
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000001a',
      '20000000-0000-4000-8000-00000000002a',
      'Duplicate pair'
    );
  exception
    when unique_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'duplicate undirected goal pair was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_goal_links (
      owner_id,
      source_goal_id,
      target_goal_id,
      note
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000001a',
      '20000000-0000-4000-8000-00000000001b',
      'Cross-owner target'
    );
  exception
    when insufficient_privilege then rejected := true;
    when foreign_key_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'cross-owner goal endpoint was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_goal_links (
      owner_id,
      source_goal_id,
      target_goal_id,
      note
    )
    values (
      '00000000-0000-4000-8000-00000000000b',
      '20000000-0000-4000-8000-00000000001b',
      '20000000-0000-4000-8000-00000000002b',
      'Forged owner'
    );
  exception
    when insufficient_privilege then rejected := true;
  end;

  if not rejected then
    raise exception 'forged goal-link ownership was accepted';
  end if;
end;
$$;

insert into public.constellation_goal_links (
  owner_id,
  source_goal_id,
  target_goal_id,
  note
)
values
  (
    '00000000-0000-4000-8000-00000000000a',
    '20000000-0000-4000-8000-00000000001a',
    '20000000-0000-4000-8000-00000000003a',
    'Relationship 2'
  ),
  (
    '00000000-0000-4000-8000-00000000000a',
    '20000000-0000-4000-8000-00000000001a',
    '20000000-0000-4000-8000-00000000004a',
    'Relationship 3'
  ),
  (
    '00000000-0000-4000-8000-00000000000a',
    '20000000-0000-4000-8000-00000000001a',
    '20000000-0000-4000-8000-00000000005a',
    'Relationship 4'
  ),
  (
    '00000000-0000-4000-8000-00000000000a',
    '20000000-0000-4000-8000-00000000001a',
    '20000000-0000-4000-8000-00000000006a',
    'Relationship 5'
  ),
  (
    '00000000-0000-4000-8000-00000000000a',
    '20000000-0000-4000-8000-00000000001a',
    '20000000-0000-4000-8000-00000000007a',
    'Relationship 6'
  );

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_goal_links (
      owner_id,
      source_goal_id,
      target_goal_id,
      note
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '20000000-0000-4000-8000-00000000001a',
      '20000000-0000-4000-8000-00000000008a',
      'Relationship 7'
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'seventh goal relationship was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_annotations (
      owner_id,
      kind,
      label
    )
    values (
      '00000000-0000-4000-8000-00000000000b',
      'note',
      'Forged owner'
    );
  exception
    when insufficient_privilege then rejected := true;
  end;

  if not rejected then
    raise exception 'forged annotation ownership was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_annotations (
      owner_id,
      kind,
      label,
      anchor_earned_node_id
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      'note',
      'Cross-owner anchor',
      '50000000-0000-4000-8000-00000000002b'
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'cross-owner annotation anchor was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_annotations (
      owner_id,
      kind,
      label
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      'trait',
      'Invalid kind'
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'invalid annotation kind was accepted';
  end if;
end;
$$;

insert into public.constellation_annotations (
  id,
  owner_id,
  kind,
  label,
  body,
  anchor_earned_node_id
)
values
  (
    '70000000-0000-4000-8000-00000000001a',
    '00000000-0000-4000-8000-00000000000a',
    'note',
    'A draft note',
    'Private body',
    '50000000-0000-4000-8000-00000000002a'
  ),
  (
    '70000000-0000-4000-8000-00000000002a',
    '00000000-0000-4000-8000-00000000000a',
    'projection',
    'A deletion-anchor projection',
    null,
    '50000000-0000-4000-8000-00000000004a'
  );

update public.constellation_annotations
set status = 'archived'
where id = '70000000-0000-4000-8000-00000000001a';

do $$
declare
  restored_rows integer;
  deleted_rows integer;
begin
  if not exists (
    select 1
    from public.constellation_annotations
    where id = '70000000-0000-4000-8000-00000000001a'
      and status = 'archived'
      and archived_at is not null
  ) then
    raise exception 'annotation archival did not set its lifecycle timestamp';
  end if;

  update public.constellation_annotations
  set status = 'draft', archived_at = null
  where id = '70000000-0000-4000-8000-00000000001a';
  get diagnostics restored_rows = row_count;

  if restored_rows <> 0 then
    raise exception 'archived annotation was restored';
  end if;

  delete from public.constellation_annotations
  where id = '70000000-0000-4000-8000-00000000001a';
  get diagnostics deleted_rows = row_count;

  if deleted_rows <> 0 then
    raise exception 'authenticated user hard-deleted an annotation';
  end if;
end;
$$;

\echo 'Checking evidence validation, uniqueness, category updates, and isolation...'

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_evidence_links (
      owner_id,
      echo_entry_id,
      goal_id,
      brt_category
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000002a',
      '20000000-0000-4000-8000-00000000002a',
      'bloom'
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'invalid BRT category was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_evidence_links (
      owner_id,
      echo_entry_id,
      goal_id,
      brt_category,
      note
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000002a',
      '20000000-0000-4000-8000-00000000002a',
      'bud',
      repeat('x', 281)
    );
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'overlong evidence note was accepted';
  end if;
end;
$$;

insert into public.constellation_evidence_links (
  id,
  owner_id,
  echo_entry_id,
  goal_id,
  brt_category,
  note
)
values (
  '80000000-0000-4000-8000-00000000001a',
  '00000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000001a',
  '20000000-0000-4000-8000-00000000001a',
  'bud',
  'Bounded private evidence'
);

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_evidence_links (
      owner_id,
      echo_entry_id,
      goal_id,
      brt_category
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000001a',
      '20000000-0000-4000-8000-00000000001a',
      'rose'
    );
  exception
    when unique_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'duplicate Echo/goal evidence reference was accepted';
  end if;
end;
$$;

update public.constellation_evidence_links
set brt_category = 'thorn', note = 'Updated category without duplication'
where id = '80000000-0000-4000-8000-00000000001a';

do $$
declare
  rejected boolean := false;
begin
  begin
    update public.constellation_evidence_links
    set goal_id = '20000000-0000-4000-8000-00000000002a'
    where id = '80000000-0000-4000-8000-00000000001a';
  exception
    when check_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'evidence relation endpoints were rewritten instead of updating category/note';
  end if;
end;
$$;

do $$
declare
  evidence_count integer;
begin
  select count(*)
  into evidence_count
  from public.constellation_evidence_links
  where echo_entry_id = '30000000-0000-4000-8000-00000000001a'
    and goal_id = '20000000-0000-4000-8000-00000000001a'
    and brt_category = 'thorn';

  if evidence_count <> 1 then
    raise exception 'evidence category update did not preserve one relation';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_evidence_links (
      owner_id,
      echo_entry_id,
      goal_id,
      brt_category
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000001a',
      '20000000-0000-4000-8000-00000000001b',
      'rose'
    );
  exception
    when insufficient_privilege or foreign_key_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'cross-owner Echo/goal evidence reference was accepted';
  end if;
end;
$$;

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_evidence_links (
      owner_id,
      echo_entry_id,
      goal_id,
      brt_category
    )
    values (
      '00000000-0000-4000-8000-00000000000b',
      '30000000-0000-4000-8000-00000000001a',
      '20000000-0000-4000-8000-00000000001a',
      'rose'
    );
  exception
    when insufficient_privilege or foreign_key_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'forged evidence ownership was accepted';
  end if;
end;
$$;

do $$
declare
  updated_rows integer;
  deleted_rows integer;
begin
  update public.constellation_evidence_links
  set brt_category = 'bud'
  where id = '80000000-0000-4000-8000-00000000001b';
  get diagnostics updated_rows = row_count;

  delete from public.constellation_evidence_links
  where id = '80000000-0000-4000-8000-00000000001b';
  get diagnostics deleted_rows = row_count;

  if updated_rows <> 0 or deleted_rows <> 0 then
    raise exception 'cross-user evidence write bypassed RLS';
  end if;
end;
$$;

do $$
declare
  updated_rows integer;
  deleted_rows integer;
begin
  update public.constellation_annotations
  set label = 'Cross-user rewrite'
  where id = '70000000-0000-4000-8000-00000000001b';
  get diagnostics updated_rows = row_count;

  delete from public.constellation_annotations
  where id = '70000000-0000-4000-8000-00000000001b';
  get diagnostics deleted_rows = row_count;

  if updated_rows <> 0 or deleted_rows <> 0 then
    raise exception 'cross-user annotation write bypassed RLS';
  end if;
end;
$$;

insert into public.constellation_evidence_links (
  id,
  owner_id,
  echo_entry_id,
  goal_id,
  brt_category
)
values (
  '80000000-0000-4000-8000-00000000002a',
  '00000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-00000000002a',
  '20000000-0000-4000-8000-00000000001a',
  'rose'
);

delete from public.constellation_evidence_links
where id = '80000000-0000-4000-8000-00000000002a';

do $$
begin
  if exists (
    select 1
    from public.constellation_evidence_links
    where id = '80000000-0000-4000-8000-00000000002a'
  ) then
    raise exception 'owner could not unlink evidence';
  end if;

  if not exists (
    select 1
    from public.echo_entries
    where id = '30000000-0000-4000-8000-00000000002a'
  ) or not exists (
    select 1
    from public.goals
    where id = '20000000-0000-4000-8000-00000000001a'
  ) then
    raise exception 'unlinking evidence deleted a source record';
  end if;
end;
$$;

do $$
declare
  canonical_count integer;
begin
  select count(*)
  into canonical_count
  from public.echo_entry_links
  where id = '40000000-0000-4000-8000-00000000001a'
    and echo_entry_id = '30000000-0000-4000-8000-00000000001a'
    and goal_id = '20000000-0000-4000-8000-00000000001a'
    and confirmed = true;

  if canonical_count <> 1 then
    raise exception 'evidence operations changed the canonical Echo container';
  end if;

  if (
    select count(*)
    from public.echo_entry_links
    where echo_entry_id = '30000000-0000-4000-8000-00000000001a'
      and confirmed = true
  ) <> 1 then
    raise exception 'evidence operations changed the one-confirmed-container invariant';
  end if;
end;
$$;

reset role;

\echo 'Checking owner alignment below RLS and explicit FK deletion behavior...'

do $$
declare
  rejected boolean := false;
begin
  begin
    insert into public.constellation_evidence_links (
      owner_id,
      echo_entry_id,
      goal_id,
      brt_category
    )
    values (
      '00000000-0000-4000-8000-00000000000a',
      '30000000-0000-4000-8000-00000000001a',
      '20000000-0000-4000-8000-00000000001b',
      'bud'
    );
  exception
    when foreign_key_violation then rejected := true;
  end;

  if not rejected then
    raise exception 'composite evidence FK allowed mismatched source ownership';
  end if;
end;
$$;

insert into public.constellation_evidence_links (
  id,
  owner_id,
  echo_entry_id,
  goal_id,
  brt_category
)
values
  (
    '80000000-0000-4000-8000-00000000003a',
    '00000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000002a',
    '20000000-0000-4000-8000-00000000001a',
    'bud'
  ),
  (
    '80000000-0000-4000-8000-00000000004a',
    '00000000-0000-4000-8000-00000000000a',
    '30000000-0000-4000-8000-00000000003a',
    '20000000-0000-4000-8000-00000000002a',
    'thorn'
  );

delete from public.echo_entries
where id = '30000000-0000-4000-8000-00000000002a';

do $$
begin
  if exists (
    select 1
    from public.constellation_evidence_links
    where id = '80000000-0000-4000-8000-00000000003a'
  ) then
    raise exception 'Echo deletion did not cascade to evidence';
  end if;

  if not exists (
    select 1
    from public.goals
    where id = '20000000-0000-4000-8000-00000000001a'
  ) then
    raise exception 'Echo deletion removed the referenced goal';
  end if;
end;
$$;

delete from public.goals
where id = '20000000-0000-4000-8000-00000000002a';

do $$
begin
  if exists (
    select 1
    from public.constellation_evidence_links
    where id = '80000000-0000-4000-8000-00000000004a'
  ) then
    raise exception 'goal deletion did not cascade to evidence';
  end if;

  if not exists (
    select 1
    from public.echo_entries
    where id = '30000000-0000-4000-8000-00000000003a'
  ) then
    raise exception 'goal deletion removed the referenced Echo';
  end if;

  if exists (
    select 1
    from public.constellation_nodes
    where id = '50000000-0000-4000-8000-00000000004a'
  ) then
    raise exception 'goal deletion did not cascade to its earned node';
  end if;

  if exists (
    select 1
    from public.constellation_edges
    where id = '60000000-0000-4000-8000-00000000002a'
  ) then
    raise exception 'earned-node deletion did not cascade to graph edges';
  end if;

  if exists (
    select 1
    from public.constellation_goal_links
    where id = '90000000-0000-4000-8000-00000000001a'
  ) then
    raise exception 'goal deletion did not cascade to user-authored goal links';
  end if;

  if not exists (
    select 1
    from public.constellation_annotations
    where id = '70000000-0000-4000-8000-00000000002a'
      and anchor_earned_node_id is null
  ) then
    raise exception 'annotation did not survive deleted anchor as unanchored';
  end if;
end;
$$;

delete from public.projects
where id = '10000000-0000-4000-8000-00000000001a';

do $$
begin
  if exists (
    select 1
    from public.constellation_nodes
    where id = '50000000-0000-4000-8000-00000000005a'
  ) then
    raise exception 'project deletion did not cascade to its ambition node';
  end if;
end;
$$;

\echo 'All Constellation database security assertions passed.'
