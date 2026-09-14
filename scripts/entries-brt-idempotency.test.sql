\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);

do $$
declare
  v_request_id constant uuid := '50000000-0000-0000-0000-000000000001';
  v_first_id uuid;
  v_retry_id uuid;
begin
  v_first_id := public.save_entry_v4(
    null,
    'reflection',
    'BRT reflection',
    '{"type":"doc","content":[{"type":"paragraph","text":"Private test content"}]}'::jsonb,
    'Private test content',
    'quick',
    '[]'::jsonb,
    null,
    false,
    false,
    null,
    array[]::uuid[],
    array[]::text[],
    array[]::uuid[],
    null,
    null,
    '[]'::jsonb,
    'rose',
    true,
    v_request_id
  );

  v_retry_id := public.save_entry_v4(
    null,
    'reflection',
    'BRT reflection retry',
    '{"type":"doc","content":[]}'::jsonb,
    '',
    'quick',
    '[]'::jsonb,
    null,
    false,
    false,
    null,
    array[]::uuid[],
    array[]::text[],
    array[]::uuid[],
    null,
    null,
    '[]'::jsonb,
    'thorn',
    true,
    v_request_id
  );

  if v_retry_id <> v_first_id then
    raise exception 'Idempotent create retry returned a different Entry';
  end if;

  perform public.save_entry_v3(
    v_first_id,
    'reflection',
    'Updated through V3',
    '{"type":"doc","content":[]}'::jsonb,
    '',
    'quick',
    '[]'::jsonb,
    null,
    false,
    false,
    null,
    array[]::uuid[],
    array[]::text[],
    array[]::uuid[],
    null,
    1,
    '[]'::jsonb
  );

  begin
    perform public.save_entry_v4(
      null,
      'note',
      'Invalid BRT note',
      '{"type":"doc","content":[]}'::jsonb,
      '',
      null,
      '[]'::jsonb,
      null,
      false,
      false,
      null,
      array[]::uuid[],
      array[]::text[],
      array[]::uuid[],
      null,
      null,
      '[]'::jsonb,
      'bud',
      true,
      '50000000-0000-0000-0000-000000000002'
    );
    raise exception 'A Note unexpectedly accepted a BRT category';
  exception
    when others then
      if sqlerrm = 'A Note unexpectedly accepted a BRT category' then raise; end if;
      if sqlerrm <> 'Only reflections can have a BRT category' then raise; end if;
  end;
end
$$;

reset role;

do $$
begin
  if (
    select count(*)
    from public.entries
    where user_id = '10000000-0000-0000-0000-000000000001'
      and client_request_id = '50000000-0000-0000-0000-000000000001'
  ) <> 1 then
    raise exception 'Idempotent create produced an unexpected Entry count';
  end if;

  if not exists (
    select 1
    from public.entries
    where user_id = '10000000-0000-0000-0000-000000000001'
      and client_request_id = '50000000-0000-0000-0000-000000000001'
      and entry_type = 'reflection'
      and title = 'Updated through V3'
      and brt_category = 'rose'
  ) then
    raise exception 'BRT category did not survive the compatible V3 update path';
  end if;
end
$$;

select 'Entries BRT and idempotent-create harness passed.' as result;
