begin;

-- Project collaborators mutate the same canonical Task occurrence used by the
-- Goal workspace. This wrapper exists only for the cross-owner authorization
-- boundary: it never creates Project-native Task state.
create or replace function public.mutate_project_task_occurrence_v12(
  p_occurrence_id uuid,
  p_operation text,
  p_delta numeric default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
set lock_timeout = '5s'
set statement_timeout = '15s'
as $$
declare
  v_actor uuid := auth.uid();
  v_occurrence public.task_occurrences;
  v_task public.tasks;
  v_task_context record;
  v_project uuid;
  v_goal_status text;
  v_receipt public.task_mutation_receipts;
  v_inserted integer;
  v_next_quantity numeric;
  v_next_status text;
  v_changed boolean := false;
begin
  if v_actor is null then raise exception 'Unauthorized'; end if;
  if p_operation not in ('complete', 'reopen', 'adjust') then raise exception 'Invalid occurrence operation'; end if;
  if nullif(btrim(p_idempotency_key), '') is null then raise exception 'Idempotency key is required'; end if;

  select o.* into v_occurrence
  from public.task_occurrences o
  where o.id = p_occurrence_id
    and o.status <> 'cancelled'
    and o.source <> 'legacy_tracker'
  for update;
  if v_occurrence.id is null then raise exception 'Task occurrence not found'; end if;

  select t as task, g.project_id, g.status
    into v_task_context
  from public.tasks t
  join public.goals g on g.id = t.goal_id
  where t.id = v_occurrence.task_id
  for update of t;
  v_task := v_task_context.task;
  v_project := v_task_context.project_id;
  v_goal_status := v_task_context.status;
  if v_task.id is null or v_project is null or v_goal_status <> 'active' then
    raise exception 'Task occurrence not found';
  end if;
  if not public.project_has_capability_v11(v_project, v_actor, 'complete_task') then
    raise exception 'Not permitted';
  end if;
  if v_task.assigned_to is not null
     and v_task.assigned_to <> v_actor
     and not public.project_has_capability_v11(v_project, v_actor, 'assign_task') then
    raise exception 'Task is assigned to another member';
  end if;

  insert into public.task_mutation_receipts
    (user_id, idempotency_key, operation, entity_id, result_entity_id)
  values
    (v_actor, btrim(p_idempotency_key), 'project.occurrence.' || p_operation, p_occurrence_id, p_occurrence_id)
  on conflict (user_id, idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select * into v_receipt
    from public.task_mutation_receipts
    where user_id = v_actor and idempotency_key = btrim(p_idempotency_key);
    if v_receipt.operation <> ('project.occurrence.' || p_operation)
       or v_receipt.entity_id <> p_occurrence_id then
      raise exception 'Idempotency key conflict';
    end if;
    return p_occurrence_id;
  end if;

  if p_operation in ('complete', 'reopen') then
    if v_task.completion_mode <> 'binary' then
      raise exception 'Quantity Tasks must use an atomic quantity mutation';
    end if;
    v_next_status := case when p_operation = 'complete' then 'completed' else 'pending' end;
    if v_occurrence.status <> v_next_status then
      update public.task_occurrences set
        status = v_next_status,
        completed_at = case when v_next_status = 'completed' then coalesce(completed_at, now()) else null end,
        completed_by = case when v_next_status = 'completed' then v_actor else null end,
        skipped_at = null
      where id = p_occurrence_id;
      v_changed := true;
    end if;
  else
    if v_task.completion_mode <> 'quantity' then
      raise exception 'Binary Tasks must use a status mutation';
    end if;
    if p_delta is null or p_delta = 0 then raise exception 'Non-zero quantity delta is required'; end if;
    v_next_quantity := coalesce(v_occurrence.actual_quantity, 0) + p_delta;
    if v_next_quantity < 0 then raise exception 'Quantity cannot be negative'; end if;
    v_next_status := case
      when v_task.target_quantity is not null and v_next_quantity >= v_task.target_quantity then 'completed'
      when v_occurrence.status = 'completed' then 'pending'
      else v_occurrence.status
    end;
    update public.task_occurrences set
      actual_quantity = v_next_quantity,
      status = v_next_status,
      completed_at = case when v_next_status = 'completed' then coalesce(completed_at, now()) else null end,
      completed_by = case when v_next_status = 'completed' then v_actor else null end,
      skipped_at = case when v_next_status = 'skipped' then skipped_at else null end
    where id = p_occurrence_id;
    v_changed := true;
  end if;

  if v_occurrence.schedule_id is null and v_changed then
    update public.tasks set
      status = case when v_next_status = 'completed' then 'complete' else 'active' end,
      completed_at = case when v_next_status = 'completed' then now() else null end
    where id = v_task.id;
  end if;

  if v_changed and v_occurrence.status <> 'completed' and v_next_status = 'completed' then
    insert into public.project_activity_events
      (project_id, actor_id, event_type, target_type, target_id, label, metadata)
    values
      (v_project, v_actor, 'task.completed', 'task', v_task.id, 'Completed Task',
       jsonb_build_object('title', v_task.title, 'occurrenceId', p_occurrence_id));
  end if;

  update public.task_mutation_receipts
  set result_payload = jsonb_build_object(
    'status', coalesce(v_next_status, v_occurrence.status),
    'quantity', coalesce(v_next_quantity, v_occurrence.actual_quantity)
  )
  where user_id = v_actor and idempotency_key = btrim(p_idempotency_key);

  return p_occurrence_id;
end;
$$;

revoke all on function public.mutate_project_task_occurrence_v12(uuid,text,numeric,text) from public, anon, service_role;
grant execute on function public.mutate_project_task_occurrence_v12(uuid,text,numeric,text) to authenticated;

comment on function public.mutate_project_task_occurrence_v12(uuid,text,numeric,text) is
  'Idempotent collaborator mutation of a canonical Goal Task occurrence; never creates Project-native Task state.';

commit;
