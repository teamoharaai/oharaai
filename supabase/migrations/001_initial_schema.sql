-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  display_name        text not null default '',
  character_profile   jsonb not null default '{}',
  interests           jsonb not null default '[]',
  context             jsonb not null default '{}',
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Goals ────────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  category     text not null check (category in ('body','mind','money','create','connect','contribute')),
  mode         text not null check (mode in ('exploration','commitment')),
  status       text not null default 'active' check (status in ('active','complete','stagnant','discovered')),
  smart_data   jsonb not null default '{}',
  is_private   boolean not null default true,
  community_id uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Milestones ───────────────────────────────────────────────────────────────
create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.goals(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  due_date    date,
  complete    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Echo Sessions (structured summaries only — never raw chat) ─────────────
create table if not exists public.echo_sessions (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid references public.goals(id) on delete set null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  summary    jsonb not null,
  created_at timestamptz not null default now()
);

-- ─── Echo Entries (reflection journal) ────────────────────────────────────
create table if not exists public.echo_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  goal_id            uuid references public.goals(id) on delete set null,
  entry_text         text not null,
  guide_response     jsonb,
  brt_classification text check (brt_classification in ('bud','rose','thorn')),
  is_public          boolean not null default false,
  created_at         timestamptz not null default now()
);

-- ─── Interests ────────────────────────────────────────────────────────────────
create table if not exists public.interests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  source_thorn_id  uuid references public.echo_entries(id) on delete set null,
  promoted_goal_id uuid references public.goals(id) on delete set null,
  name             text not null,
  status           text not null default 'suggested' check (status in ('suggested','exploring','promoted','dismissed')),
  created_at       timestamptz not null default now()
);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.handle_updated_at();
