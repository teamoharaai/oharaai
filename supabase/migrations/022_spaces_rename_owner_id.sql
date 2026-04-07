-- Migration 022: Rename spaces.user_id to spaces.owner_id
-- Aligns the DB column with the TS type (Space.ownerId).
-- Affects: spaces column, indexes on spaces, RLS policies on spaces,
--          RLS policies on space_members that subquery spaces.user_id,
--          and the handle_new_user_space() trigger function.

-- ─── 1. Rename column ─────────────────────────────────────────────────────────

alter table public.spaces rename column user_id to owner_id;

-- ─── 2. Drop and recreate indexes on spaces ──────────────────────────────────

drop index if exists spaces_user_id_idx;
create index spaces_owner_id_idx on public.spaces(owner_id);

-- Partial unique index from migration 021 — column name must change.
drop index if exists spaces_one_personal_per_user_idx;
create unique index spaces_one_personal_per_user_idx
  on public.spaces(owner_id)
  where (type = 'personal');

-- ─── 3. Drop and recreate RLS policies on public.spaces ──────────────────────
-- These policies directly reference the renamed column.

drop policy if exists "Users can read own and member spaces" on public.spaces;
drop policy if exists "Authenticated users can create spaces" on public.spaces;
drop policy if exists "Owners can update their spaces" on public.spaces;
drop policy if exists "Owners can delete their spaces" on public.spaces;

create policy "Users can read own and member spaces"
  on public.spaces for select using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.space_members sm
      where sm.space_id = spaces.id
        and sm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create spaces"
  on public.spaces for insert with check (
    auth.uid() = owner_id
  );

create policy "Owners can update their spaces"
  on public.spaces for update using (
    owner_id = auth.uid()
  );

create policy "Owners can delete their spaces"
  on public.spaces for delete using (
    owner_id = auth.uid()
  );

-- ─── 4. Drop and recreate space_members policies that reference spaces.user_id ──
-- These subquery into public.spaces and check s.user_id — must update to owner_id.
-- space_members.user_id is NOT renamed; only the subquery column reference changes.

drop policy if exists "Members can see their space members" on public.space_members;
drop policy if exists "Space owners can manage members" on public.space_members;
drop policy if exists "Space owners can update members" on public.space_members;
drop policy if exists "Space owners can remove members" on public.space_members;

create policy "Members can see their space members"
  on public.space_members for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.spaces s
      where s.id = space_members.space_id
        and s.owner_id = auth.uid()
    )
  );

create policy "Space owners can manage members"
  on public.space_members for insert with check (
    exists (
      select 1
      from public.spaces s
      where s.id = space_members.space_id
        and s.owner_id = auth.uid()
    )
  );

create policy "Space owners can update members"
  on public.space_members for update using (
    exists (
      select 1
      from public.spaces s
      where s.id = public.space_members.space_id
        and s.owner_id = auth.uid()
    )
  );

create policy "Space owners can remove members"
  on public.space_members for delete using (
    exists (
      select 1
      from public.spaces s
      where s.id = public.space_members.space_id
        and s.owner_id = auth.uid()
    )
  );

-- ─── 5. Update handle_new_user_space() to reference owner_id ─────────────────
-- Replaces the version from migration 021. Function signature unchanged.
-- Only the column name in INSERT, ON CONFLICT, and SELECT changes.

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
    insert into public.spaces (name, type, owner_id, config)
    values ('Personal', 'personal', new.id, '{"llmTier":"haiku"}'::jsonb)
    on conflict (owner_id) where (type = 'personal') do nothing;

    select id into v_space_id
    from public.spaces
    where owner_id = new.id
      and type = 'personal';

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
