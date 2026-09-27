-- 078 probe: the Goal operation ledger. Copy equivalence of the three old receipt tables, the operation
-- surface (lookup/discover/ack/close) over a real work write, tombstone fencing of a delayed request, one
-- identity space across protocols, owner isolation, retention, provenance on the ledger, grants and the
-- pg_cron job. Runs inside the preflight's single transaction (rolled back; with --apply, in a savepoint
-- that is rolled back before COMMIT), after the 072-077 probes have removed their synthetic accounts.

-- Every old receipt has an identical ledger row, and nothing else is in the ledger yet.
do $$
declare missing bigint;
begin
  select count(*) into missing from goal_private.operations o where not exists (select 1 from goal_private.operation_ledger l
    where l.owner_id = o.owner_id and l.operation_id = o.operation_id and l.protocol = 'goal.create' and l.seq = o.seq
      and (l.operation_type, l.digest, l.state, l.reason, l.revision, l.goal_id, l.goal_version, l.recorded_at, l.terminal_at,
           l.acknowledged_at, l.admission_deadline, l.reviewed_revision, l.reviewed_resolver)
      is not distinct from (case when o.digest is not null then 'goal.create.manual' end, o.digest, o.state, o.reason, o.revision,
           o.goal_id, o.goal_version, o.first_recorded_at, o.terminal_at, o.acknowledged_at, o.admission_deadline,
           o.reviewed_revision, o.reviewed_resolver));
  if missing > 0 then raise exception '078 probe: % goal.create receipts were not copied exactly', missing; end if;
  select count(*) into missing from goal_private.goal_mutations m where not exists (select 1 from goal_private.operation_ledger l
    where l.owner_id = m.owner_id and l.operation_id = m.operation_id and l.protocol = 'goal.mutate'
      and (l.operation_type, l.goal_id, l.expected_version, l.digest, l.state, l.reason, l.goal_version, l.recorded_at,
           l.terminal_at, l.acknowledged_at, l.revision)
      is not distinct from (m.operation_type, m.goal_id, m.expected_version, m.digest, m.state, m.reason, m.goal_version,
           m.recorded_at, m.recorded_at, m.acknowledged_at, 1::bigint));
  if missing > 0 then raise exception '078 probe: % goal.mutate receipts were not copied exactly', missing; end if;
  select count(*) into missing from goal_private.work_mutations w where not exists (select 1 from goal_private.operation_ledger l
    where l.owner_id = w.owner_id and l.operation_id = w.operation_id and l.protocol = 'goal.work'
      and (l.operation_type, l.goal_id, l.entity_id, l.digest, l.state, l.reason, l.recorded_at, l.terminal_at, l.acknowledged_at)
      is not distinct from (w.operation_type, w.goal_id, w.entity_id, w.digest, w.state, w.reason, w.recorded_at, w.recorded_at, null::timestamptz));
  if missing > 0 then raise exception '078 probe: % goal.work receipts were not copied exactly', missing; end if;
  if (select count(*) from goal_private.operation_ledger) <> (select count(*) from goal_private.operations)
      + (select count(*) from goal_private.goal_mutations) + (select count(*) from goal_private.work_mutations) then
    raise exception '078 probe: the ledger holds rows that are not copies'; end if;
  if exists (select 1 from goal_private.counters c where c.last_seq < (select coalesce(max(seq), 0) from goal_private.operation_ledger l where l.owner_id = c.owner_id)) then
    raise exception '078 probe: a counter is behind its ledger sequence'; end if;
end $$;

insert into auth.users(id,email,raw_user_meta_data) values
  ('11a00e2e-7878-4078-8078-000000000001','goal-ledger-probe@local.ohara.test','{}'),
  ('11a00e2e-7878-4078-8078-000000000002','goal-ledger-probe-other@local.ohara.test','{}');
update public.profiles set timezone='America/New_York' where id='11a00e2e-7878-4078-8078-000000000001';
do $$
declare
  owner constant text := '11a00e2e-7878-4078-8078-000000000001';
  other constant text := '11a00e2e-7878-4078-8078-000000000002';
  committed_id constant text := '22a00e2e-7878-4078-8078-000000000001';
  closed_id constant text := '22a00e2e-7878-4078-8078-000000000002';
  goal text; task text; r jsonb; late jsonb;
begin
  insert into public.goals(user_id, title, category, status) values (owner::uuid, 'Ledger probe', 'Work & Money', 'active')
    returning id::text into goal;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', owner, true);

  -- A committed work write is visible through the operation surface.
  r := public.goal_work_v1('mutate', jsonb_build_object('operationId', committed_id, 'operationType', 'task.create',
    'contractVersion', 1, 'goalId', goal, 'fields', '{"title":"Ledger task","completionMode":"binary"}'::jsonb,
    'schedule', '{"kind":"once","dueDate":null}'::jsonb));
  task := r#>>'{data,task,id}';
  if r#>>'{data,state}' is distinct from 'committed' or task is null then raise exception '078 probe: work write failed: %', r; end if;
  r := public.goal_operations_v1('lookup', jsonb_build_object('operationId', committed_id));
  if r->'data' is null or (r#>>'{data,protocol}', r#>>'{data,operationType}', r#>>'{data,state}', r#>>'{data,entityId}',
      r#>>'{data,goalId}', r#>>'{data,revision}', r#>>'{data,acknowledged}')
      is distinct from ('goal.work', 'task.create', 'committed', task, goal, '1', 'false') then
    raise exception '078 probe: lookup failed: %', r; end if;
  r := public.goal_operations_v1('discover', '{}'::jsonb);
  if not exists (select 1 from jsonb_array_elements(r#>'{data,items}') i where i->>'operationId' = committed_id) then
    raise exception '078 probe: discover omitted an unacknowledged outcome: %', r; end if;
  r := public.goal_operations_v1('ack', jsonb_build_object('operationId', committed_id, 'revision', '2'));
  if r#>>'{error,code}' is distinct from 'RECEIPT_REVISION_MISMATCH' then raise exception '078 probe: ack of an unseen revision: %', r; end if;
  r := public.goal_operations_v1('ack', jsonb_build_object('operationId', committed_id, 'revision', '1'));
  if r#>>'{data,acknowledged}' is distinct from 'true' then raise exception '078 probe: ack failed: %', r; end if;
  r := public.goal_operations_v1('discover', '{}'::jsonb);
  if exists (select 1 from jsonb_array_elements(r#>'{data,items}') i where i->>'operationId' = committed_id) then
    raise exception '078 probe: an acknowledged outcome is still discovered: %', r; end if;

  -- close writes a tombstone; the delayed request then answers not_committed in its own type and writes nothing.
  r := public.goal_operations_v1('close', jsonb_build_object('operationId', closed_id, 'protocol', 'goal.work'));
  if (r#>>'{data,state}', r#>>'{data,reason}', r#>>'{data,protocol}') is distinct from ('not_committed', 'closed_by_owner', 'goal.work') then
    raise exception '078 probe: close failed: %', r; end if;
  late := public.goal_work_v1('mutate', jsonb_build_object('operationId', closed_id, 'operationType', 'task.create',
    'contractVersion', 1, 'goalId', goal, 'fields', '{"title":"Late task","completionMode":"binary"}'::jsonb,
    'schedule', '{"kind":"once","dueDate":null}'::jsonb));
  if (late#>>'{data,state}', late#>>'{data,reason}', late#>>'{data,operationType}') is distinct from ('not_committed', 'closed_by_owner', 'task.create')
    or late#>'{data,task}' <> 'null'::jsonb then raise exception '078 probe: a closed identity was not fenced: %', late; end if;

  -- One identity space: another protocol cannot reuse an operation ID.
  r := public.goal_card_v1('mutate', jsonb_build_object('operationId', committed_id, 'operationType', 'goal.complete',
    'contractVersion', 1, 'goalId', goal, 'expectedVersion', 1));
  if r#>>'{error,code}' is distinct from 'OPERATION_PAYLOAD_MISMATCH' then raise exception '078 probe: cross-protocol reuse: %', r; end if;

  -- Another owner sees nothing; operation identities are per owner.
  perform set_config('request.jwt.claim.sub', other, true);
  r := public.goal_operations_v1('lookup', jsonb_build_object('operationId', committed_id));
  if r#>>'{error,code}' is distinct from 'HISTORY_UNAVAILABLE' then raise exception '078 probe: cross-owner lookup: %', r; end if;
  r := public.goal_operations_v1('ack', jsonb_build_object('operationId', closed_id, 'revision', '1'));
  if r#>>'{error,code}' is distinct from 'HISTORY_UNAVAILABLE' then raise exception '078 probe: cross-owner ack: %', r; end if;
  perform set_config('role', 'none', true);

  if exists (select 1 from public.tasks where goal_id = goal::uuid and title = 'Late task') then
    raise exception '078 probe: the fenced request wrote a Task'; end if;

  -- Retention: an outcome acknowledged more than 30 days ago is pruned; recent ones stay.
  update goal_private.operation_ledger set acknowledged_at = clock_timestamp() - interval '31 days'
    where owner_id = owner::uuid and operation_id = committed_id::uuid;
  perform goal_private.prune_operations();
  if exists (select 1 from goal_private.operation_ledger where owner_id = owner::uuid and operation_id = committed_id::uuid) then
    raise exception '078 probe: retention kept an expired acknowledged outcome'; end if;
  if not exists (select 1 from goal_private.operation_ledger where owner_id = owner::uuid and operation_id = closed_id::uuid) then
    raise exception '078 probe: retention removed a recent tombstone'; end if;

  -- Provenance points at the ledger and refuses deletion instead of cascading.
  if not exists (select 1 from pg_constraint where conname = 'provenance_operation_fkey'
      and conrelid = 'goal_private.provenance'::regclass and confrelid = 'goal_private.operation_ledger'::regclass and confdeltype = 'a') then
    raise exception '078 probe: provenance does not reference the ledger with NO ACTION'; end if;

  -- Ownership, grants and schedule as deployed.
  if (select pg_get_userbyid(proowner) from pg_proc where oid = 'public.goal_operations_v1(text,jsonb)'::regprocedure) <> 'goal_manual_executor'
    or not (select prosecdef from pg_proc where oid = 'public.goal_operations_v1(text,jsonb)'::regprocedure) then
    raise exception '078 probe: goal_operations_v1 is not a security definer owned by goal_manual_executor'; end if;
  if has_function_privilege('anon', 'public.goal_operations_v1(text,jsonb)', 'EXECUTE')
    or has_function_privilege('service_role', 'public.goal_operations_v1(text,jsonb)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.goal_operations_v1(text,jsonb)', 'EXECUTE') then
    raise exception '078 probe: goal_operations_v1 grants differ'; end if;
  if has_function_privilege('service_role', 'public.goal_card_v1(text,jsonb)', 'EXECUTE') then
    raise exception '078 probe: service_role can still execute goal_card_v1'; end if;
  if has_function_privilege('authenticated', 'goal_private.prune_operations(integer)', 'EXECUTE')
    or has_function_privilege('service_role', 'goal_private.prune_operations(integer)', 'EXECUTE') then
    raise exception '078 probe: clients can execute prune_operations'; end if;
  if has_table_privilege('authenticated', 'goal_private.operation_ledger', 'SELECT')
    or has_table_privilege('service_role', 'goal_private.operation_ledger', 'SELECT') then
    raise exception '078 probe: clients can read the ledger'; end if;
  if has_table_privilege('goal_manual_executor', 'goal_private.work_mutations', 'INSERT')
    or has_table_privilege('goal_manual_executor', 'goal_private.goal_mutations', 'INSERT')
    or has_table_privilege('goal_manual_executor', 'goal_private.operations', 'INSERT') then
    raise exception '078 probe: an old receipt table is still writable'; end if;
  if not exists (select 1 from cron.job where jobname = 'goal-operation-retention' and schedule = '17 3 * * *'
      and command = 'select goal_private.prune_operations()') then
    raise exception '078 probe: the retention job is not scheduled'; end if;
  if exists (select 1 from pg_auth_members where roleid = 'goal_manual_executor'::regrole and (inherit_option or set_option)) then
    raise exception '078 probe: temporary SET/INHERIT membership survived'; end if;
  if has_schema_privilege('goal_manual_executor', 'public', 'CREATE') or has_schema_privilege('goal_manual_executor', 'goal_private', 'CREATE') then
    raise exception '078 probe: temporary schema CREATE survived'; end if;

  -- Account deletion cascades the ledger.
  delete from auth.users where id in (owner::uuid, other::uuid);
  if exists (select 1 from goal_private.operation_ledger where owner_id in (owner::uuid, other::uuid)) then
    raise exception '078 probe: account cascade failed'; end if;
end $$;
