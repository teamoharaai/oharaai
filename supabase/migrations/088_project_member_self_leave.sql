-- Let a Project collaborator remove only their own non-owner membership.
-- Canonical Project content remains intact; responsibility pointers are cleared
-- so a departed member is not left assigned to inaccessible work.

begin;

create or replace function public.leave_project_v11(p_project_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));

  select role into v_role
  from public.project_members
  where project_id = p_project_id and user_id = auth.uid();

  if v_role is null then
    raise exception 'Project not found';
  end if;
  if v_role = 'owner' then
    raise exception 'Project owners cannot leave their Project';
  end if;

  update public.goals
  set project_lead_id = null
  where project_id = p_project_id and project_lead_id = auth.uid();

  update public.tasks task
  set assigned_to = null
  where assigned_to = auth.uid()
    and exists (
      select 1 from public.goals goal
      where goal.id = task.goal_id and goal.project_id = p_project_id
    );

  update public.milestones milestone
  set responsible_user_id = null
  where responsible_user_id = auth.uid()
    and exists (
      select 1 from public.goals goal
      where goal.id = milestone.goal_id and goal.project_id = p_project_id
    );

  delete from public.project_members
  where project_id = p_project_id and user_id = auth.uid() and role <> 'owner';

  return found;
end;
$$;

revoke all on function public.leave_project_v11(uuid) from public, anon;
grant execute on function public.leave_project_v11(uuid) to authenticated;

comment on function public.leave_project_v11(uuid) is
  'Removes the current non-owner member from a Project and clears only their responsibility pointers.';

commit;
