-- Migration 036: Entries — Notes and Reflections
--
-- Adds a user-scoped, additive Entries domain without changing the existing
-- echo_entries / echo_entry_links container model. The existing Echo tables
-- retain their single-confirmed-container invariant; Entries supports the
-- many-to-many goal relationships required by Notes and guided Reflections.

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('note', 'reflection')),
  title text not null default '',
  content jsonb not null default '{"type":"doc","blocks":[]}'::jsonb,
  plain_text text not null default '',
  reflection_type text check (
    reflection_type is null
    or reflection_type in ('week', 'goal', 'milestone', 'open')
  ),
  conversation_turns jsonb not null default '[]'::jsonb,
  takeaway text,
  pinned boolean not null default false,
  archived boolean not null default false,
  content_version integer not null default 1 check (content_version > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index entries_user_type_updated_idx
  on public.entries (user_id, entry_type, updated_at desc)
  where archived = false;
create index entries_user_unlinked_idx
  on public.entries (user_id, updated_at desc)
  where entry_type = 'note' and archived = false;

create table public.entry_goal_links (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (entry_id, goal_id)
);

create index entry_goal_links_goal_idx on public.entry_goal_links (goal_id, created_at desc);

create table public.entry_category_links (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  category_id text not null check (
    category_id in (
      'health',
      'finance',
      'career',
      'creative',
      'education',
      'relationships',
      'growth'
    )
  ),
  link_source text not null default 'category_only'
    check (link_source in ('category_only', 'inherited')),
  created_at timestamptz not null default now(),
  unique (entry_id, category_id)
);

create index entry_category_links_category_idx
  on public.entry_category_links (category_id, created_at desc);

create table public.reflection_milestone_links (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (entry_id, milestone_id)
);

create index reflection_milestone_links_milestone_idx
  on public.reflection_milestone_links (milestone_id, created_at desc);

create or replace function public.touch_entry_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    new.title,
    new.content,
    new.plain_text,
    new.reflection_type,
    new.conversation_turns,
    new.takeaway,
    new.pinned,
    new.archived,
    new.content_version,
    new.completed_at
  ) is distinct from (
    old.title,
    old.content,
    old.plain_text,
    old.reflection_type,
    old.conversation_turns,
    old.takeaway,
    old.pinned,
    old.archived,
    old.content_version,
    old.completed_at
  ) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger entries_touch_updated_at
before update on public.entries
for each row execute function public.touch_entry_updated_at();

alter table public.entries enable row level security;
alter table public.entry_goal_links enable row level security;
alter table public.entry_category_links enable row level security;
alter table public.reflection_milestone_links enable row level security;

create policy "Users can select own entries" on public.entries
  for select using (user_id = auth.uid());
create policy "Users can insert own entries" on public.entries
  for insert with check (user_id = auth.uid());
create policy "Users can update own entries" on public.entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can delete own entries" on public.entries
  for delete using (user_id = auth.uid());

create policy "Users can select own entry goal links" on public.entry_goal_links
  for select using (
    exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );
create policy "Users can insert own entry goal links" on public.entry_goal_links
  for insert with check (
    exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
    and exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );
create policy "Users can delete own entry goal links" on public.entry_goal_links
  for delete using (
    exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );

create policy "Users can select own entry category links" on public.entry_category_links
  for select using (
    exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );
create policy "Users can insert own entry category links" on public.entry_category_links
  for insert with check (
    exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );
create policy "Users can delete own entry category links" on public.entry_category_links
  for delete using (
    exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );

create policy "Users can select own reflection milestone links"
  on public.reflection_milestone_links
  for select using (
    exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );
create policy "Users can insert own reflection milestone links"
  on public.reflection_milestone_links
  for insert with check (
    exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
    and exists (
      select 1 from public.milestones m
      where m.id = milestone_id and m.user_id = auth.uid()
    )
  );
create policy "Users can delete own reflection milestone links"
  on public.reflection_milestone_links
  for delete using (
    exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );

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
    case
      when g.category = 'body' then 'health'
      when g.category = 'mind' then 'education'
      when g.category = 'money' then 'finance'
      when g.category = 'create' then 'creative'
      when g.category = 'connect' then 'relationships'
      when g.category = 'contribute' then 'growth'
      else g.category
    end,
    'inherited'
  from public.goals g
  where g.id = any(coalesce(p_goal_ids, '{}'::uuid[]))
    and g.user_id = auth.uid()
    and g.status <> 'archived'
  on conflict (entry_id, category_id) do nothing;

  insert into public.entry_category_links (entry_id, category_id, link_source)
  select p_entry_id, linked_category_id
  from unnest(coalesce(p_category_ids, '{}'::text[])) as linked_category_id
  where linked_category_id in (
    'health', 'finance', 'career', 'creative', 'education', 'relationships', 'growth'
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

create or replace function public.save_entry(
  p_entry_id uuid,
  p_entry_type text,
  p_title text,
  p_content jsonb,
  p_plain_text text,
  p_reflection_type text,
  p_conversation_turns jsonb,
  p_takeaway text,
  p_pinned boolean,
  p_archived boolean,
  p_completed_at timestamptz,
  p_goal_ids uuid[],
  p_category_ids text[],
  p_milestone_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_entry_type not in ('note', 'reflection') then raise exception 'Invalid entry type'; end if;
  if p_entry_type = 'note' and p_reflection_type is not null then
    raise exception 'Notes cannot have a reflection type';
  end if;

  if p_entry_id is null then
    insert into public.entries (
      user_id,
      entry_type,
      title,
      content,
      plain_text,
      reflection_type,
      conversation_turns,
      takeaway,
      pinned,
      archived,
      completed_at
    )
    values (
      auth.uid(),
      p_entry_type,
      p_title,
      p_content,
      p_plain_text,
      p_reflection_type,
      p_conversation_turns,
      p_takeaway,
      p_pinned,
      p_archived,
      p_completed_at
    )
    returning id into v_entry_id;
  else
    update public.entries
    set
      entry_type = p_entry_type,
      title = p_title,
      content = p_content,
      plain_text = p_plain_text,
      reflection_type = p_reflection_type,
      conversation_turns = p_conversation_turns,
      takeaway = p_takeaway,
      pinned = p_pinned,
      archived = p_archived,
      completed_at = p_completed_at,
      content_version = content_version + 1
    where id = p_entry_id and user_id = auth.uid()
    returning id into v_entry_id;

    if v_entry_id is null then raise exception 'Entry not found'; end if;
  end if;

  perform public.replace_entry_relationships(
    v_entry_id,
    p_goal_ids,
    p_category_ids,
    p_milestone_ids
  );
  return v_entry_id;
end;
$$;

revoke all on function public.save_entry(
  uuid, text, text, jsonb, text, text, jsonb, text, boolean, boolean,
  timestamptz, uuid[], text[], uuid[]
) from public;
grant execute on function public.save_entry(
  uuid, text, text, jsonb, text, text, jsonb, text, boolean, boolean,
  timestamptz, uuid[], text[], uuid[]
) to authenticated;

-- Preserve existing user-authored Echo history as completed Reflections.
-- IDs remain stable and the source rows remain untouched.
insert into public.entries (
  id,
  user_id,
  entry_type,
  title,
  content,
  plain_text,
  reflection_type,
  conversation_turns,
  completed_at,
  created_at,
  updated_at
)
select
  ee.id,
  ee.user_id,
  'reflection',
  coalesce(nullif(btrim(ee.title), ''), 'Reflection'),
  jsonb_build_object(
    'type', 'doc',
    'blocks', jsonb_build_array(
      jsonb_build_object('id', ee.id::text || '-body', 'type', 'paragraph', 'text', ee.content)
    )
  ),
  ee.content,
  'open',
  jsonb_build_array(
    jsonb_build_object(
      'id', ee.id::text || '-response',
      'role', 'user',
      'content', ee.content,
      'createdAt', ee.created_at
    )
  ),
  coalesce(ee.processed_at, ee.created_at),
  ee.created_at,
  coalesce(ee.processed_at, ee.created_at)
from public.echo_entries ee
on conflict (id) do nothing;

insert into public.entry_goal_links (entry_id, goal_id, created_at)
select eel.echo_entry_id, eel.goal_id, eel.created_at
from public.echo_entry_links eel
join public.entries e on e.id = eel.echo_entry_id
where eel.container_type = 'goal'
  and eel.confirmed = true
  and eel.goal_id is not null
on conflict (entry_id, goal_id) do nothing;

insert into public.entry_goal_links (entry_id, goal_id, created_at)
select ee.id, ee.goal_id, ee.created_at
from public.echo_entries ee
join public.entries e on e.id = ee.id
join public.goals g on g.id = ee.goal_id and g.user_id = ee.user_id
where ee.goal_id is not null
on conflict (entry_id, goal_id) do nothing;

insert into public.entry_category_links (entry_id, category_id, link_source, created_at)
select
  egl.entry_id,
  case
    when g.category = 'body' then 'health'
    when g.category = 'mind' then 'education'
    when g.category = 'money' then 'finance'
    when g.category = 'create' then 'creative'
    when g.category = 'connect' then 'relationships'
    when g.category = 'contribute' then 'growth'
    else g.category
  end,
  'inherited',
  egl.created_at
from public.entry_goal_links egl
join public.goals g on g.id = egl.goal_id
on conflict (entry_id, category_id) do nothing;
