\set ON_ERROR_STOP on

create schema auth;
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
grant execute on function auth.uid() to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'body',
  status text not null default 'active' check (
    status in ('active','draft','complete','stagnant','discovered','archived')
  ),
  smart_data jsonb not null default '{}'::jsonb,
  project_id uuid,
  space_id uuid,
  target_frequency jsonb,
  visibility text not null default 'private',
  color_theme text not null default 'ocean',
  embedding_text text,
  previous_goal_id uuid references public.goals(id) on delete set null,
  deadline timestamptz,
  prior_phase_summary jsonb,
  reflection text,
  reflected_at timestamptz,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_goals_previous_goal_id
  on public.goals(previous_goal_id) where previous_goal_id is not null;

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed_at timestamptz,
  sort_order integer not null default 0,
  is_ai_suggested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trackers (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  type text not null check (type in ('counter','habit','checklist')),
  target_value numeric,
  target_unit text,
  frequency text check (frequency in ('daily','weekly','monthly')),
  current_value numeric not null default 0,
  is_ai_suggested boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tracker_logs (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers(id) on delete cascade,
  value numeric not null default 1,
  note text,
  logged_at timestamptz not null default now()
);
create index idx_tracker_logs_tracker_id on public.tracker_logs(tracker_id);

create table public.action_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_text text not null,
  status text default 'pending' check (status in ('pending','complete','skipped')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Minimal Entry objects required because migration 045 replaces their RPCs.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('note','reflection')),
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
);
create table public.entry_goal_links (
  entry_id uuid not null references public.entries(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  primary key(entry_id, goal_id)
);
create table public.entry_category_links (
  entry_id uuid not null references public.entries(id) on delete cascade,
  category_id text not null,
  link_source text not null,
  primary key(entry_id, category_id)
);
create table public.reflection_milestone_links (
  entry_id uuid not null references public.entries(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  primary key(entry_id, milestone_id)
);
create table public.entry_goal_progress_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  reference_id text not null,
  block_id text,
  source_type text not null,
  excerpt text not null default '',
  checkbox_completed boolean not null default false,
  completion_count integer not null default 0,
  reference_created_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entry_id, reference_id)
);
create table public.entry_goal_progress_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  reference_id text not null,
  block_id text,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.trackers enable row level security;
alter table public.tracker_logs enable row level security;
alter table public.action_logs enable row level security;

create policy harness_profiles on public.profiles for all to authenticated
  using (id=auth.uid()) with check (id=auth.uid());
create policy harness_goals on public.goals for all to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy harness_milestones on public.milestones for all to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy harness_trackers on public.trackers for all to authenticated
  using (goal_id in (select id from public.goals where user_id=auth.uid()))
  with check (goal_id in (select id from public.goals where user_id=auth.uid()));
create policy harness_tracker_logs on public.tracker_logs for all to authenticated
  using (tracker_id in (
    select tracker.id from public.trackers tracker
    join public.goals goal on goal.id=tracker.goal_id
    where goal.user_id=auth.uid()
  ))
  with check (tracker_id in (
    select tracker.id from public.trackers tracker
    join public.goals goal on goal.id=tracker.goal_id
    where goal.user_id=auth.uid()
  ));
create policy harness_action_logs on public.action_logs for all to authenticated
  using (
    user_id=auth.uid()
    and exists(select 1 from public.goals where id=goal_id and user_id=auth.uid())
  )
  with check (
    user_id=auth.uid()
    and exists(select 1 from public.goals where id=goal_id and user_id=auth.uid())
  );

grant usage on schema public to authenticated, service_role;
grant select,insert,update,delete on all tables in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
