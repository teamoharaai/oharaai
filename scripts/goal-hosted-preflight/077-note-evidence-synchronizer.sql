-- 077 probe: clients can no longer call the Note evidence synchronizer, and the save path desktop and
-- native use (save_entry_v2, a security definer) still records Goal evidence.
-- Runs inside the preflight's single rollback-only transaction (scripts/test-manual-goal-hosted.mjs).
insert into auth.users(id,email,raw_user_meta_data)
values('11a00e2e-7777-4077-8077-000000000001','note-evidence-probe@local.ohara.test','{}');
insert into public.goals(id,user_id,title,status,category)
values('11a00e2e-7777-4077-8077-0000000000a1','11a00e2e-7777-4077-8077-000000000001','Evidence probe','active','Work & Money');
insert into public.entries(id,user_id,entry_type,content)
values('11a00e2e-7777-4077-8077-0000000000b1','11a00e2e-7777-4077-8077-000000000001','note','{"type":"doc","blocks":[]}'::jsonb);
do $$
declare blocked boolean;
begin
  if has_function_privilege('authenticated', 'public.sync_entry_goal_progress_evidence(uuid,jsonb)', 'EXECUTE')
    or has_function_privilege('anon', 'public.sync_entry_goal_progress_evidence(uuid,jsonb)', 'EXECUTE') then
    raise exception '077 probe: a client role can still execute the evidence synchronizer'; end if;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11a00e2e-7777-4077-8077-000000000001', true);
  begin
    perform public.sync_entry_goal_progress_evidence('11a00e2e-7777-4077-8077-0000000000b1', '[]'::jsonb);
    blocked := false;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception '077 probe: direct synchronizer call was allowed'; end if;

  -- The editor path still works and still records the evidence.
  perform public.save_entry_v2(
    '11a00e2e-7777-4077-8077-0000000000b1', 'note', 'Probe plan',
    '{"type":"doc","schemaVersion":2,"content":[{"type":"taskList","content":[{"type":"taskItem","attrs":{"id":"task-1","checked":true},"content":[{"type":"paragraph","attrs":{"id":"paragraph-1"},"content":[{"type":"text","text":"Finish probe","marks":[{"type":"goalReference","attrs":{"referenceId":"goal-ref-1","goalId":"11a00e2e-7777-4077-8077-0000000000a1","blockId":"task-1","sourceType":"checkbox","createdAt":"2026-09-26T12:00:00.000Z","progressEvidence":true}}]}]}]}]}]}'::jsonb,
    'Finish probe', null, '[]'::jsonb, null, false, false, null,
    array[]::uuid[], array[]::text[], array[]::uuid[], 1,
    '[{"referenceId":"goal-ref-1","goalId":"11a00e2e-7777-4077-8077-0000000000a1","blockId":"task-1","sourceType":"checkbox","excerpt":"Finish probe","createdAt":"2026-09-26T12:00:00.000Z","checkboxCompleted":false}]'::jsonb);
  perform set_config('role', 'none', true);

  if not exists (select 1 from public.entry_goal_progress_evidence
                 where entry_id = '11a00e2e-7777-4077-8077-0000000000b1' and reference_id = 'goal-ref-1') then
    raise exception '077 probe: save_entry_v2 no longer records Goal evidence'; end if;
  delete from auth.users where id = '11a00e2e-7777-4077-8077-000000000001';
end $$;
