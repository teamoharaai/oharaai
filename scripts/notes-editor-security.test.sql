\set ON_ERROR_STOP on

-- Runs on the full migration chain (scripts/db-chain/suites/notes-editor.sh): signup (008/028) creates
-- the profile, and real Goals need a post-068 scoring category.
insert into auth.users (id) values ('10000000-0000-0000-0000-000000000001');
insert into public.goals (id, user_id, title, status, category) values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Build OHARA',
  'active',
  'Work & Money'
);
insert into public.entries (id, user_id, entry_type, content) values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'note',
  '{"type":"doc","blocks":[{"id":"legacy","type":"paragraph","text":"Legacy"}]}'::jsonb
);

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);

select public.save_entry_v2(
  '30000000-0000-0000-0000-000000000001',
  'note',
  'Prototype plan',
  '{"type":"doc","schemaVersion":2,"content":[{"type":"taskList","content":[{"type":"taskItem","attrs":{"id":"task-1","checked":true},"content":[{"type":"paragraph","attrs":{"id":"paragraph-1"},"content":[{"type":"text","text":"Finish prototype","marks":[{"type":"goalReference","attrs":{"referenceId":"goal-ref-1","goalId":"20000000-0000-0000-0000-000000000001","blockId":"task-1","sourceType":"checkbox","createdAt":"2026-08-19T12:00:00.000Z","progressEvidence":true}}]}]}]}]}]}'::jsonb,
  'Finish prototype',
  null,
  '[]'::jsonb,
  null,
  false,
  false,
  null,
  array[]::uuid[],
  array[]::text[],
  array[]::uuid[],
  1,
  '[{"referenceId":"goal-ref-1","goalId":"20000000-0000-0000-0000-000000000001","blockId":"task-1","sourceType":"checkbox","excerpt":"Finish prototype","createdAt":"2026-08-19T12:00:00.000Z","checkboxCompleted":false}]'::jsonb
);

reset role;

do $$
begin
  if has_function_privilege(
    'authenticated',
    'public.sync_entry_goal_progress_evidence(uuid,jsonb)',
    'execute'
  ) then
    raise exception 'Authenticated clients can execute the internal evidence synchronizer';
  end if;
  if not exists (
    select 1 from public.entry_goal_progress_evidence
    where entry_id = '30000000-0000-0000-0000-000000000001'
      and reference_id = 'goal-ref-1'
      and checkbox_completed = true
      and completion_count = 1
  ) then
    raise exception 'Checked state was not derived from the canonical note document';
  end if;
  if (select count(*) from public.entry_goal_progress_events) <> 1 then
    raise exception 'Expected exactly one canonical completion transition';
  end if;
  if (select schema_version from public.entries where id = '30000000-0000-0000-0000-000000000001') <> 2 then
    raise exception 'Entry schema version trigger did not record V2';
  end if;
  if (select public from storage.buckets where id = 'note-images') <> false then
    raise exception 'Note image bucket is not private';
  end if;
end
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);

-- Removing a Goal Reference preserves the checked document item and immutable
-- completion event while removing the current/future evidence mapping.
select public.save_entry_v2(
  '30000000-0000-0000-0000-000000000001',
  'note',
  'Prototype plan',
  '{"type":"doc","schemaVersion":2,"content":[{"type":"taskList","content":[{"type":"taskItem","attrs":{"id":"task-1","checked":true},"content":[{"type":"paragraph","attrs":{"id":"paragraph-1"},"content":[{"type":"text","text":"Finish prototype"}]}]}]}]}'::jsonb,
  'Finish prototype',
  null,
  '[]'::jsonb,
  null,
  false,
  false,
  null,
  array[]::uuid[],
  array[]::text[],
  array[]::uuid[],
  2,
  '[]'::jsonb
);

reset role;

do $$
begin
  if exists (
    select 1 from public.entry_goal_progress_evidence
    where entry_id = '30000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Removed Goal Reference retained future progress evidence';
  end if;
  if (select count(*) from public.entry_goal_progress_events) <> 1 then
    raise exception 'Removing the current reference rewrote canonical progress history';
  end if;
  if (
    select content #>> '{content,0,content,0,attrs,checked}'
    from public.entries
    where id = '30000000-0000-0000-0000-000000000001'
  ) <> 'true' then
    raise exception 'Removing Goal Reference changed the document checkbox';
  end if;
  if not exists (
    select 1 from public.goals
    where id = '20000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Removing Goal Reference deleted the Goal';
  end if;
end
$$;

select 'Notes editor database security harness passed.' as result;

reset role;
insert into auth.users (id) values ('10000000-0000-0000-0000-000000000002');
insert into public.projects (id, user_id, title, status) values
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Build OHARA',
    'active'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Another user project',
    'active'
  );

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);

select public.save_entry_v3(
  '30000000-0000-0000-0000-000000000001',
  'note',
  'Prototype plan',
  '{"type":"doc","schemaVersion":2,"content":[{"type":"paragraph","attrs":{"id":"paragraph-1"},"content":[{"type":"text","text":"Finish prototype"}]}]}'::jsonb,
  'Finish prototype',
  null,
  '[]'::jsonb,
  null,
  false,
  false,
  null,
  array[]::uuid[],
  array[]::text[],
  array[]::uuid[],
  '40000000-0000-0000-0000-000000000001',
  3,
  '[]'::jsonb
);

do $$
begin
  begin
    perform public.save_entry_v3(
      '30000000-0000-0000-0000-000000000001',
      'note',
      'Prototype plan',
      '{"type":"doc","schemaVersion":2,"content":[{"type":"paragraph","attrs":{"id":"paragraph-1"}}]}'::jsonb,
      '',
      null,
      '[]'::jsonb,
      null,
      false,
      false,
      null,
      array[]::uuid[],
      array[]::text[],
      array[]::uuid[],
      '40000000-0000-0000-0000-000000000002',
      4,
      '[]'::jsonb
    );
    raise exception 'Cross-user Project assignment unexpectedly succeeded';
  exception
    when others then
      if sqlerrm = 'Cross-user Project assignment unexpectedly succeeded' then raise; end if;
      if sqlerrm <> 'Invalid Project' then raise; end if;
  end;
end
$$;

reset role;

do $$
begin
  if (
    select project_id from public.entries
    where id = '30000000-0000-0000-0000-000000000001'
  ) <> '40000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'Owner Project association did not persist';
  end if;
end
$$;

select 'Echo V1 Project relationship harness passed.' as result;

-- Echo owns its Entries (Migration 086, TD-005 B5/B10): every canonical writer refuses an Echo-origin Entry and
-- its links with ECHO_OWNED; the Echo write itself still reaches the canonical copy.
insert into public.milestones (id, goal_id, user_id, title) values (
  '20000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001', 'Echo guard milestone'
);
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
select set_config('ohara.echo_entry', public.create_echo_entry_with_container(
  'Captured in Echo', null, '20000000-0000-0000-0000-000000000001', false, null, null, null)::text, false);

do $$
declare
  echo_id uuid := current_setting('ohara.echo_entry')::uuid;
  linked_goal uuid := '20000000-0000-0000-0000-000000000001';
  writer text;
begin
  if not exists (select 1 from public.entries where id = echo_id) then
    raise exception 'The Echo capture did not reach its canonical Entry';
  end if;
  foreach writer in array array[
    format($q$select public.save_entry(%L, 'reflection', 't', '{"type":"doc","blocks":[]}', '', 'open', '[]', null, false, false, null, '{}', '{}', '{}')$q$, echo_id),
    format($q$select public.save_entry_v2(%L, 'reflection', 't', '{"type":"doc","blocks":[]}', '', 'open', '[]', null, false, false, null, '{}', '{}', '{}', 1, '[]')$q$, echo_id),
    format($q$select public.save_entry_v4(%L, 'reflection', 't', '{"type":"doc","blocks":[]}', '', 'open', '[]', null, false, false, null, '{}', '{}', '{}', null, 1, '[]', null, false, null)$q$, echo_id),
    format($q$select public.replace_entry_relationships(%L, '{}', '{}', '{}')$q$, echo_id),
    format($q$select public.set_entry_project_share_v11(%L, 'private')$q$, echo_id),
    format($q$update public.entries set pinned = true where id = %L$q$, echo_id),
    format($q$delete from public.entries where id = %L$q$, echo_id),
    format($q$delete from public.entry_goal_links where entry_id = %L$q$, echo_id),
    format($q$insert into public.entry_category_links (entry_id, category_id, link_source) values (%L, 'Health & Fitness', 'category_only')$q$, echo_id),
    format($q$insert into public.reflection_milestone_links (entry_id, milestone_id) values (%L, '20000000-0000-0000-0000-0000000000e1')$q$, echo_id)
  ] loop
    begin
      execute writer;
      raise exception 'Echo-owned write unexpectedly succeeded: %', writer;
    exception
      when others then
        if sqlerrm not like 'ECHO_OWNED:%' then raise; end if;
    end;
  end loop;
  if not exists (select 1 from public.entry_goal_links l where l.entry_id = echo_id and l.goal_id = linked_goal) then
    raise exception 'A refused write changed the Echo-owned links';
  end if;
end
$$;

reset role;
set role service_role;
do $$
begin
  update public.entries set title = 'Service edit' where id = current_setting('ohara.echo_entry')::uuid;
  raise exception 'The service role edited an Echo-owned Entry';
exception
  when others then
    if sqlerrm not like 'ECHO_OWNED:%' then raise; end if;
end
$$;
reset role;

select 'Echo-owned Entry guard passed.' as result;
