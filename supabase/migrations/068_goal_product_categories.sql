-- Goals V2.2 exact product taxonomy. Momentum profiles were frozen in 067.
create function public.goal_product_category(p_category text, p_goal_id uuid default null)
returns text language plpgsql immutable set search_path=pg_catalog,public as $$
declare result text;
begin
  if p_category in ('Health & Fitness','Work & Money','Learning & Creativity','Life & Relationships') then return p_category; end if;
  result := case lower(btrim(p_category))
    when 'body' then 'Health & Fitness' when 'health' then 'Health & Fitness' when 'health_fitness' then 'Health & Fitness'
    when 'money' then 'Work & Money' when 'finance' then 'Work & Money' when 'career' then 'Work & Money'
    when 'create' then 'Learning & Creativity' when 'creative' then 'Learning & Creativity' when 'education' then 'Learning & Creativity'
    when 'connect' then 'Life & Relationships' when 'relationships' then 'Life & Relationships'
    when 'contribute' then 'Life & Relationships' when 'growth' then 'Life & Relationships' when 'personal_growth' then 'Life & Relationships'
    when 'mind' then case p_goal_id::text
      when '0072a366-4863-4004-b16c-404c5a096fd0' then 'Learning & Creativity'
      when '11125ce9-713e-4ede-84a2-cbae9e41012e' then 'Health & Fitness'
      when '1941106e-85e5-4947-850e-25eeb9fffa31' then 'Life & Relationships'
      when '465140b0-0183-41dc-9dcb-09136ee48f2e' then 'Health & Fitness'
      when '5e7a4487-98a1-4bea-9fb6-c7a05b98097c' then 'Learning & Creativity'
      when '79ed0b33-a2e5-41b1-a4c7-63c1ddf90f8e' then 'Learning & Creativity'
      when '98046f42-f474-480a-b782-fff92da86bb0' then 'Learning & Creativity'
      when 'ad607078-f9ac-45a5-bd35-a0e68e0de31b' then 'Learning & Creativity'
      when 'ae716a0f-a7ed-44cd-9161-ca6193fd9287' then 'Health & Fitness'
      when 'ddd70994-48da-4c0e-adc4-1673f6976414' then 'Learning & Creativity'
      else null end
    else null end;
  if result is null then raise exception 'Unapproved category mapping: %, Goal %',p_category,p_goal_id; end if;
  return result;
end $$;

alter table public.goals drop constraint goals_category_check;
update public.goals set category=public.goal_product_category(category,id);
alter table public.goals add constraint goals_category_check check
  (category in ('Health & Fitness','Work & Money','Learning & Creativity','Life & Relationships'));

-- Preserve original relationship records for audit when merged categories collide.
create table public.category_link_migration_history (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  original_record jsonb not null
);
alter table public.category_link_migration_history enable row level security;
create policy "Owners read original category links" on public.category_link_migration_history
  for select to authenticated using(user_id=auth.uid());
revoke all on public.category_link_migration_history from anon,authenticated;
grant select on public.category_link_migration_history to authenticated;
insert into public.category_link_migration_history(id,user_id,original_record)
select l.id,e.user_id,to_jsonb(l) from public.entry_category_links l join public.entries e on e.id=l.entry_id;

alter table public.entry_category_links drop constraint entry_category_links_category_id_check;
-- Keep the oldest identity for each merged category; historical rows above remain intact.
delete from public.entry_category_links l using public.entry_category_links keeper
where l.entry_id=keeper.entry_id
  and public.goal_product_category(l.category_id)=public.goal_product_category(keeper.category_id)
  and (l.created_at,l.id)>(keeper.created_at,keeper.id);
update public.entry_category_links set category_id=public.goal_product_category(category_id);
-- Re-derive inherited organization from actual Goal references, including the
-- individually approved mind mappings. Preserve original link rows above.
delete from public.entry_category_links where link_source='inherited';
insert into public.entry_category_links(entry_id,category_id,link_source,created_at)
select l.entry_id,g.category,'inherited',min(l.created_at)
from public.entry_goal_links l join public.goals g on g.id=l.goal_id
group by l.entry_id,g.category
on conflict(entry_id,category_id) do nothing;
alter table public.entry_category_links add constraint entry_category_links_category_id_check check
  (category_id in ('Health & Fitness','Work & Money','Learning & Creativity','Life & Relationships'));

-- Circles post category snapshots and Momentum history are intentionally unchanged.
-- Their product presentation uses the adapter; scoring continues to use 067.

create or replace function public.start_agent_session(
  p_external_session_id text,
  p_project_id uuid,
  p_project_title text,
  p_project_description text,
  p_period_key text,
  p_start_date date,
  p_end_date date,
  p_goal_title text,
  p_goal_description text,
  p_goal_category text,
  p_goal_color_theme text
)
returns table(session_id uuid, project_id uuid, goal_id uuid, was_created boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_project_id uuid;
  v_goal_id uuid;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  if p_external_session_id is null or char_length(btrim(p_external_session_id)) not between 1 and 200 then
    raise exception 'external_session_id must contain 1 to 200 characters';
  end if;
  if p_period_key is null or char_length(btrim(p_period_key)) not between 1 and 100 then
    raise exception 'period_key must contain 1 to 100 characters';
  end if;
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'A valid project date range is required';
  end if;
  if p_goal_title is null or char_length(btrim(p_goal_title)) not between 1 and 200 then
    raise exception 'goal title must contain 1 to 200 characters';
  end if;
  if p_goal_category is null or p_goal_category not in ('Health & Fitness','Work & Money','Learning & Creativity','Life & Relationships') then
    raise exception 'Invalid goal category';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || btrim(p_external_session_id), 0)
  );

  select s.id, s.project_id, s.goal_id
  into v_session_id, v_project_id, v_goal_id
  from public.echo_sessions s
  where s.user_id = v_user_id
    and s.external_session_id = btrim(p_external_session_id);

  if v_session_id is not null then
    return query select v_session_id, v_project_id, v_goal_id, false;
    return;
  end if;

  if p_project_id is not null then
    select p.id into v_project_id
    from public.projects p
    where p.id = p_project_id and p.user_id = v_user_id;

    if v_project_id is null then raise exception 'Project not found'; end if;

    update public.projects
    set start_date = coalesce(start_date, p_start_date),
        end_date = coalesce(end_date, p_end_date),
        period_key = coalesce(period_key, btrim(p_period_key))
    where id = v_project_id;
  else
    insert into public.projects (
      user_id, title, description, start_date, end_date, period_key
    )
    values (
      v_user_id,
      btrim(p_project_title),
      nullif(btrim(p_project_description), ''),
      p_start_date,
      p_end_date,
      btrim(p_period_key)
    )
    on conflict (user_id, period_key) where (period_key is not null)
    do update set
      start_date = coalesce(public.projects.start_date, excluded.start_date),
      end_date = coalesce(public.projects.end_date, excluded.end_date)
    returning id into v_project_id;
  end if;

  insert into public.goals (
    user_id,
    title,
    description,
    category,
    color_theme,
    deadline,
    project_id,
    smart_data,
    ai_generated
  )
  values (
    v_user_id,
    btrim(p_goal_title),
    nullif(btrim(p_goal_description), ''),
    p_goal_category,
    p_goal_color_theme,
    p_end_date::timestamptz,
    v_project_id,
    '{}'::jsonb,
    false
  )
  returning id into v_goal_id;

  insert into public.echo_sessions (
    goal_id,
    project_id,
    user_id,
    external_session_id,
    status,
    summary
  )
  values (
    v_goal_id,
    v_project_id,
    v_user_id,
    btrim(p_external_session_id),
    'active',
    jsonb_build_object('version', 1, 'state', 'active')
  )
  returning id into v_session_id;

  return query select v_session_id, v_project_id, v_goal_id, true;
end;
$$;

create or replace function public.replace_entry_relationships(
  p_entry_id uuid,
  p_goal_ids uuid[],
  p_category_ids text[],
  p_milestone_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not exists (
    select 1 from public.entries e
    where e.id = p_entry_id and e.user_id = auth.uid()
  ) then
    raise exception 'Entry not found';
  end if;

  delete from public.entry_goal_links where entry_id = p_entry_id;
  delete from public.entry_category_links where entry_id = p_entry_id;
  delete from public.reflection_milestone_links where entry_id = p_entry_id;

  insert into public.entry_goal_links (entry_id, goal_id)
  select p_entry_id, linked_goal_id
  from unnest(coalesce(p_goal_ids, '{}'::uuid[])) as linked_goal_id
  where exists (
    select 1 from public.goals g
    where g.id = linked_goal_id and g.user_id = auth.uid() and g.status <> 'archived'
  )
  on conflict (entry_id, goal_id) do nothing;

  insert into public.entry_category_links (entry_id, category_id, link_source)
  select
    p_entry_id,
    g.category,
    'inherited'
  from public.goals g
  where g.id = any(coalesce(p_goal_ids, '{}'::uuid[]))
    and g.user_id = auth.uid()
    and g.status <> 'archived'
  on conflict (entry_id, category_id) do nothing;

  insert into public.entry_category_links (entry_id, category_id, link_source)
  select p_entry_id, linked_category_id, 'category_only'
  from unnest(coalesce(p_category_ids, '{}'::text[])) as linked_category_id
  where linked_category_id in (
    'Health & Fitness', 'Work & Money', 'Learning & Creativity', 'Life & Relationships'
  )
  on conflict (entry_id, category_id) do nothing;

  insert into public.reflection_milestone_links (entry_id, milestone_id)
  select p_entry_id, linked_milestone_id
  from unnest(coalesce(p_milestone_ids, '{}'::uuid[])) as linked_milestone_id
  where exists (
    select 1 from public.milestones m
    where m.id = linked_milestone_id and m.user_id = auth.uid()
  )
  on conflict (entry_id, milestone_id) do nothing;
end;
$$;

revoke all on function public.replace_entry_relationships(uuid, uuid[], text[], uuid[]) from public;
grant execute on function public.replace_entry_relationships(uuid, uuid[], text[], uuid[])
  to authenticated;
