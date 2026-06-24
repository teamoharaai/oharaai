create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (
    role in (
      'owner','member','admin','instructor','student',
      'organizer','sponsor','volunteer'
    )
  ),
  status text not null default 'active' check (
    status in ('active','archived','invited')
  ),
  joined_at timestamptz not null default now(),
  unique(space_id, user_id)
);

create index space_members_space_id_idx on public.space_members(space_id);
create index space_members_user_id_idx on public.space_members(user_id);

alter table public.space_members enable row level security;

create policy "Members can see their space members"
  on public.space_members for select using (
    exists (
      select 1
      from public.space_members sm
      where sm.space_id = public.space_members.space_id
        and sm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.spaces s
      where s.id = public.space_members.space_id
        and s.user_id = auth.uid()
    )
  );

create policy "Space owners can manage members"
  on public.space_members for insert with check (
    exists (
      select 1
      from public.spaces s
      where s.id = space_members.space_id
        and s.user_id = auth.uid()
    )
  );

create policy "Space owners can update members"
  on public.space_members for update using (
    exists (
      select 1
      from public.spaces s
      where s.id = public.space_members.space_id
        and s.user_id = auth.uid()
    )
  );

create policy "Space owners can remove members"
  on public.space_members for delete using (
    exists (
      select 1
      from public.spaces s
      where s.id = public.space_members.space_id
        and s.user_id = auth.uid()
    )
  );

create policy "Members can read shared spaces"
  on public.spaces for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.space_members sm
      where sm.space_id = public.spaces.id
        and sm.user_id = auth.uid()
    )
  );