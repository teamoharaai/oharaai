\set ON_ERROR_STOP on

create schema auth;

create role authenticated nologin;

create table auth.users (
  id uuid primary key
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null
);

create table public.echo_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null
);

create table public.echo_entry_links (
  id uuid primary key default gen_random_uuid(),
  echo_entry_id uuid not null references public.echo_entries(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  confirmed boolean not null default false
);

create unique index echo_entry_links_one_confirmed_per_entry
  on public.echo_entry_links (echo_entry_id)
  where confirmed = true;

alter table public.projects enable row level security;
alter table public.goals enable row level security;
alter table public.echo_entries enable row level security;
alter table public.echo_entry_links enable row level security;

create policy "Harness users can access own projects"
  on public.projects
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Harness users can access own goals"
  on public.goals
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Harness users can access own echo entries"
  on public.echo_entries
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Harness users can access own echo entry links"
  on public.echo_entry_links
  for all
  using (
    exists (
      select 1
      from public.echo_entries entry
      where entry.id = echo_entry_id
        and entry.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.echo_entries entry
      where entry.id = echo_entry_id
        and entry.user_id = auth.uid()
    )
  );
