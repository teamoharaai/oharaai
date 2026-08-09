-- Migration 037: fix category-only relationship replacement
--
-- Migration 036's category-only INSERT named link_source as a target column
-- but did not provide its value. Replace the function with the intended
-- category_only source while leaving existing Entries and Echo data untouched.

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
  select p_entry_id, linked_category_id, 'category_only'
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

