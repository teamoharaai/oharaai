-- 086 probe: the Echo -> canonical mirror (TD-005 D3, B3/B4/B10). The triggers, guard and grants are in place, and
-- a synthetic owner's Echo capture, edit, AI update, move and delete reach (or deliberately don't reach) the
-- canonical Entry, its link and goal_events, while every canonical write to it is refused with ECHO_OWNED.
-- Runs inside the preflight's single transaction (rolled back; with --apply, in a savepoint rolled back before COMMIT).

do $$
declare
  expected text[] := array[
    'echo_entries:echo_mirror_delete', 'echo_entries:echo_mirror_insert', 'echo_entries:echo_mirror_update',
    'echo_entry_links:echo_mirror_link_delete', 'echo_entry_links:echo_mirror_link_insert', 'echo_entry_links:echo_mirror_link_update',
    'entries:echo_owned_guard', 'entry_category_links:echo_owned_guard', 'entry_goal_links:echo_owned_guard',
    'reflection_milestone_links:echo_owned_guard'];
  actual text[];
  fn regprocedure;
begin
  select array_agg(c.relname || ':' || t.tgname order by c.relname, t.tgname) into actual
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  where not t.tgisinternal and (t.tgname like 'echo_mirror_%' or t.tgname = 'echo_owned_guard');
  if actual is distinct from expected then raise exception '086 probe: triggers are %, expected %', actual, expected; end if;
  if pg_get_triggerdef((select oid from pg_trigger where tgname = 'echo_mirror_update')) not like '%WHEN%' then
    raise exception '086 probe: the Echo update trigger has no WHEN clause (AI updates would fire it)';
  end if;
  foreach fn in array array['goal_private.echo_entry_goals(uuid[])', 'goal_private.mirror_echo_entries(uuid[],boolean)',
      'goal_private.echo_entry_mirror()', 'goal_private.echo_link_mirror()']::regprocedure[] loop
    if pg_get_userbyid((select proowner from pg_proc where oid = fn)) <> 'goal_manual_executor' then
      raise exception '086 probe: % is not owned by goal_manual_executor', fn;
    end if;
  end loop;
  if (select prosecdef from pg_proc where oid = 'goal_private.refuse_echo_owned_write()'::regprocedure) then
    raise exception '086 probe: the ECHO_OWNED guard must run as the caller (security invoker)';
  end if;
  if has_function_privilege('authenticated', 'goal_private.mirror_echo_entries(uuid[],boolean)', 'execute')
    or has_function_privilege('service_role', 'goal_private.mirror_echo_entries(uuid[],boolean)', 'execute')
    or has_function_privilege('anon', 'goal_private.mirror_echo_entries(uuid[],boolean)', 'execute') then
    raise exception '086 probe: the mirror must not be callable by clients';
  end if;
end $$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('11a00e2e-8086-4086-8086-000000000001','echo-mirror-probe@local.ohara.test','{}');
do $$
declare
  owner constant uuid := '11a00e2e-8086-4086-8086-000000000001';
  goal_a uuid; goal_b uuid; folder uuid; entry uuid; version integer;
begin
  insert into public.goals(user_id, title, category, status) values (owner, 'Echo probe A', 'Work & Money', 'active') returning id into goal_a;
  insert into public.goals(user_id, title, category, status) values (owner, 'Echo probe B', 'Health & Fitness', 'active') returning id into goal_b;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', owner::text, true);

  -- Capture (023), as desktop's POST /api/entries does.
  entry := public.create_echo_entry_with_container('Probe capture', null, goal_a, false, null, null, null);
  if not exists (select 1 from public.entries where id = entry and entry_type = 'reflection' and plain_text = 'Probe capture')
    or not exists (select 1 from public.entry_goal_links where entry_id = entry and goal_id = goal_a) then
    raise exception '086 probe: the capture did not reach its canonical Entry and Goal link';
  end if;
  perform set_config('role', 'postgres', true);
  if not exists (select 1 from goal_private.goal_events where entity_id = entry and goal_id = goal_a and kind = 'entry_created') then
    raise exception '086 probe: the capture recorded no goal_events row';
  end if;
  perform set_config('role', 'authenticated', true);

  -- Edit (PATCH route), then an AI update that must not touch the copy.
  update public.echo_entries set content = 'Probe edit' where id = entry;
  select content_version into version from public.entries where id = entry and plain_text = 'Probe edit';
  if version is distinct from 2 then raise exception '086 probe: the edit did not reach the copy (version %)', version; end if;
  update public.echo_entries set ai_status = 'completed', processed_at = now(), emotion = '{}' where id = entry;
  if (select content_version from public.entries where id = entry) <> 2 then raise exception '086 probe: an AI update fired the mirror'; end if;
  update public.echo_entries set brt_category = 'rose' where id = entry;
  if (select brt_category from public.entries where id = entry) is distinct from 'rose' then raise exception '086 probe: the BRT choice was not mirrored'; end if;

  -- B10: canonical writes are refused.
  begin
    update public.entries set title = 'Library edit' where id = entry;
    raise exception '086 probe: a canonical edit of an Echo-owned Entry succeeded';
  exception when others then
    if sqlerrm not like 'ECHO_OWNED:%' then raise; end if;
  end;

  -- Move (moveEntryContainer): to Goal B, then to a folder.
  update public.echo_entry_links set goal_id = goal_b where echo_entry_id = entry and confirmed;
  if (select array_agg(goal_id) from public.entry_goal_links where entry_id = entry) is distinct from array[goal_b] then
    raise exception '086 probe: the move to Goal B was not mirrored';
  end if;
  insert into public.echo_folders(user_id, name) values (owner, 'Probe folder') returning id into folder;
  update public.echo_entry_links set container_type = 'folder', goal_id = null, folder_id = folder where echo_entry_id = entry and confirmed;
  if exists (select 1 from public.entry_goal_links where entry_id = entry) then
    raise exception '086 probe: moving to a folder kept a Goal link';
  end if;

  -- Delete (DELETE route).
  delete from public.echo_entries where id = entry;
  if exists (select 1 from public.entries where id = entry) then raise exception '086 probe: the delete left the canonical copy'; end if;
end $$;
reset role;
delete from auth.users where id = '11a00e2e-8086-4086-8086-000000000001';
do $$
begin
  if exists(select 1 from public.entries where user_id = '11a00e2e-8086-4086-8086-000000000001')
    or exists(select 1 from goal_private.goal_events where owner_id = '11a00e2e-8086-4086-8086-000000000001')
    or exists(select 1 from public.goals where user_id = '11a00e2e-8086-4086-8086-000000000001') then
    raise exception '086 probe: synthetic rows survived account deletion';
  end if;
end $$;
