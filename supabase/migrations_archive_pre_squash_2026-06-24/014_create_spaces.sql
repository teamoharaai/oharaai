-- Spaces: contained environments within Ohara
-- Personal space auto-created per user. Team spaces created by users.
-- Institutional and Community are Phase 3 (schema supports now).

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('personal','team','institutional','community')),
  user_id uuid not null references auth.users(id) on delete cascade,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spaces_user_id_idx on public.spaces(user_id);

alter table public.spaces enable row level security;

create policy "Users can read own spaces"
  on public.spaces for select using (
    user_id = auth.uid()
  );

create policy "Authenticated users can create spaces"
  on public.spaces for insert with check (
    auth.uid() = user_id
  );

create policy "Owners can update their spaces"
  on public.spaces for update using (
    user_id = auth.uid()
  );

create policy "Owners can delete their spaces"
  on public.spaces for delete using (
    user_id = auth.uid()
  );