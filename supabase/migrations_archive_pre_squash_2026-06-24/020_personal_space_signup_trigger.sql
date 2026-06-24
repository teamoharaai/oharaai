-- Migration 020: Personal space + owner membership on signup
-- Fires after a profile row is inserted (which itself fires from on_auth_user_created).
-- Non-blocking: errors are logged as warnings; signup always continues.

create or replace function public.handle_new_user_space()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space_id uuid;
begin
  begin
    -- Idempotent: reuse existing personal space if one already exists.
    select id into v_space_id
    from public.spaces
    where user_id = NEW.id
      and type = 'personal'
    limit 1;

    if v_space_id is null then
      insert into public.spaces (name, type, user_id, config)
      values ('Personal', 'personal', NEW.id, '{"llmTier":"haiku"}'::jsonb)
      returning id into v_space_id;
    end if;

    -- Idempotent: ON CONFLICT DO NOTHING covers the UNIQUE(space_id, user_id) constraint.
    insert into public.space_members (space_id, user_id, role, status)
    values (v_space_id, NEW.id, 'owner', 'active')
    on conflict (space_id, user_id) do nothing;

  exception when others then
    raise warning '[handle_new_user_space] Failed to provision personal space for user %: %',
      NEW.id, sqlerrm;
  end;

  return NEW;
end;
$$;

drop trigger if exists on_profile_created_create_space on public.profiles;

create trigger on_profile_created_create_space
  after insert on public.profiles
  for each row execute function public.handle_new_user_space();
