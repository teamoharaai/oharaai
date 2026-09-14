\set ON_ERROR_STOP on

do $$
declare
  v_task uuid;
  v_total integer;
  v_distinct integer;
  v_quantity numeric;
  v_receipts integer;
begin
  select id into v_task from public.tasks where create_idempotency_key='create:weekly';
  select count(*), count(distinct occurrence_key)
  into v_total, v_distinct
  from public.task_occurrences
  where task_id=v_task;
  if v_total <> v_distinct then
    raise exception 'Concurrent reconciliation created duplicate logical occurrences';
  end if;

  select occurrence.actual_quantity into v_quantity
  from public.task_occurrences occurrence
  join public.tasks task on task.id=occurrence.task_id
  where task.create_idempotency_key='create:quantity'
  limit 1;
  if v_quantity <> 10 then
    raise exception 'Concurrent mutation retry applied more than one delta: %', v_quantity;
  end if;

  select count(*) into v_receipts
  from public.task_mutation_receipts
  where idempotency_key='quantity:concurrent';
  if v_receipts <> 1 then
    raise exception 'Concurrent mutation retry created % receipts', v_receipts;
  end if;
end $$;

\echo 'Concurrent reconciliation and idempotent mutation assertions passed.'
