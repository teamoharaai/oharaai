\set ON_ERROR_STOP on

-- Minimal production-shaped objects Migration 053 depends on. Isolated local
-- cluster only (see run-circles-security.sh); never run against Supabase.

create schema auth;
create schema extensions;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create table auth.users (id uuid primary key);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth to authenticated, service_role;
grant usage on schema extensions to authenticated, service_role;
grant execute on function auth.uid() to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'UTC'
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'growth',
  status text not null default 'active' check (
    status in ('active','draft','complete','stagnant','discovered','archived','expired')
  ),
  visibility text not null default 'private' check (visibility in ('private','circle','public')),
  reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;
create policy "Users can select own goals" on public.goals for select using (user_id = auth.uid());
create policy "Users can update own goals" on public.goals for update using (user_id = auth.uid());

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  completed_at timestamptz,
  sort_order integer not null default 0,
  parent_id uuid references public.milestones(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.milestones enable row level security;
create policy "Users can select own milestones" on public.milestones for select using (user_id = auth.uid());

create table public.friend_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('note','reflection')),
  title text not null default '',
  plain_text text not null default ''
);

alter table public.entries enable row level security;
create policy "Users can select own entries" on public.entries for select using (user_id = auth.uid());

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active','complete','archived'))
);

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  scheduled_local_date date,
  status text not null default 'pending'
    check (status in ('pending','completed','skipped','missed','cancelled')),
  completed_at timestamptz
);

alter table public.tasks enable row level security;
alter table public.task_occurrences enable row level security;
create policy "Users can select own tasks" on public.tasks for select using (user_id = auth.uid());
create policy "Users can select own occurrences" on public.task_occurrences for select using (user_id = auth.uid());

grant select, update on table public.goals to authenticated;
grant select on table public.milestones, public.entries, public.tasks, public.task_occurrences to authenticated;
grant select on table public.profiles, public.friend_connections to authenticated;
