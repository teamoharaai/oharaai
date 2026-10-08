-- PreLaunch lifecycle cleanup.
--
-- A normal Goal detach records its prior Project. During ON DELETE SET NULL
-- from a Project deletion, however, that Project is already being removed and
-- cannot be referenced by a new history row. Skip only that synthetic detach;
-- ordinary user-driven detach/reassignment history remains unchanged.

create or replace function public.record_project_goal_event_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if new.project_id is not null then
      insert into public.project_goal_events (owner_id, project_id, goal_id, event_type)
      values (new.user_id, new.project_id, new.id, 'added');
    end if;
    return new;
  end if;

  if old.project_id is not distinct from new.project_id then return new; end if;
  if old.project_id is null then
    insert into public.project_goal_events (owner_id, project_id, goal_id, event_type)
    values (new.user_id, new.project_id, new.id, 'added');
  elsif new.project_id is null then
    if exists (select 1 from public.projects where id = old.project_id) then
      insert into public.project_goal_events (owner_id, prior_project_id, goal_id, event_type)
      values (new.user_id, old.project_id, new.id, 'detached');
    end if;
  else
    insert into public.project_goal_events (owner_id, project_id, prior_project_id, goal_id, event_type)
    values (new.user_id, new.project_id, old.project_id, new.id, 'reassigned');
  end if;
  return new;
end;
$$;
