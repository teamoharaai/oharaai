\set ON_ERROR_STOP on

insert into auth.users (id) values ('10000000-0000-0000-0000-000000000001');
insert into public.profiles (id) values ('10000000-0000-0000-0000-000000000001');
insert into public.goals (id, user_id, title, status) values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Build OHARA',
  'active'
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
