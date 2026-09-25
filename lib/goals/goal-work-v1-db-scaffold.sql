-- Synthetic prerequisites for Migration 074 tests only. Order on a fresh database:
-- manual-v1-db-scaffold.sql → this file → the REAL Task chain (048, 056, 057, 059, 063, 064) → 072 → 073 → 074.
-- Milestones mirror 001 + 025 + 052 (including the updated_at trigger and owner RLS) so the canonical
-- Task RPCs, triggers and constraints run unmodified. It certifies nothing about the full hosted chain.
alter table public.goals add column completed_at timestamptz, add column archived_at timestamptz;
create function public.handle_updated_at() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create table public.milestones(
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, due_date date, created_at timestamptz not null default now(),
  description text, completed_at timestamptz, sort_order integer not null default 0,
  is_ai_suggested boolean not null default false, updated_at timestamptz not null default now(),
  kind text not null default 'achievement' check (kind in ('prep','achievement')),
  parent_id uuid references public.milestones(id) on delete cascade,
  target_count integer check (target_count is null or target_count > 0), photo_url text);
create trigger milestones_updated_at before update on public.milestones for each row execute function public.handle_updated_at();
alter table public.milestones enable row level security;
create policy "Users can select own milestones" on public.milestones for select using (user_id = auth.uid());
create policy "Users can insert own milestones" on public.milestones for insert with check (user_id = auth.uid());
create policy "Users can update own milestones" on public.milestones for update using (user_id = auth.uid());
grant select, insert, update on public.milestones to authenticated;
create table public.entries(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,entry_type text not null,title text not null default '',plain_text text not null default '',archived boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.entry_goal_links(id uuid primary key default gen_random_uuid(),entry_id uuid not null references public.entries on delete cascade,goal_id uuid not null references public.goals on delete cascade,created_at timestamptz not null default now(),unique(entry_id,goal_id));
