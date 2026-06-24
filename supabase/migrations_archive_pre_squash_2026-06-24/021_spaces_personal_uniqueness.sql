-- Migration 021: Enforce at most one personal space per user
--
-- Adds a partial unique index on spaces(user_id) WHERE type = 'personal'.
-- This is the DB-level guarantee — SELECT-before-INSERT in trigger code alone
-- is not race-safe under concurrent writes.
--
-- Also updates handle_new_user_space() to use ON CONFLICT against the new
-- index, removing the SELECT-then-INSERT TOCTOU window from migration 020.
--
-- SECURITY DEFINER audit: all three SECURITY DEFINER functions (handle_new_user,
-- consume_daily_ai_quota, handle_new_user_space) already pin
-- SET search_path = public and schema-qualify table references. No fixes needed.

-- ─── 1. Partial unique index ─────────────────────────────────────────────────

create unique index if not exists spaces_one_personal_per_user_idx
  on public.spaces(user_id)
  where (type = 'personal');

-- ─── 2. Update trigger function to use ON CONFLICT ───────────────────────────
-- Replaces the SELECT-then-INSERT pattern from 020 with a single atomic
-- INSERT ... ON CONFLICT DO NOTHING followed by a guaranteed SELECT.
-- The partial index is now the primary enforcement mechanism.

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
    -- Insert personal space. The partial unique index on (user_id) WHERE
    -- type = 'personal' enforces the one-per-user constraint at the DB level.
    -- ON CONFLICT DO NOTHING makes this idempotent without a prior SELECT.
    insert into public.spaces (name, type, user_id, config)
    values ('Personal', 'personal', new.id, '{"llmTier":"haiku"}'::jsonb)
    on conflict (user_id) where (type = 'personal') do nothing;

    -- Fetch the id regardless of whether the insert succeeded or was a no-op.
    select id into v_space_id
    from public.spaces
    where user_id = new.id
      and type = 'personal';

    -- Insert owner membership. UNIQUE(space_id, user_id) handles idempotency.
    insert into public.space_members (space_id, user_id, role, status)
    values (v_space_id, new.id, 'owner', 'active')
    on conflict (space_id, user_id) do nothing;

  exception when others then
    raise warning '[handle_new_user_space] Failed to provision personal space for user %: %',
      new.id, sqlerrm;
  end;

  return new;
end;
$$;
