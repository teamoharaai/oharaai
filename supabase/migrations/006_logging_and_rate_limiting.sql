-- ============================================================================
-- 006_logging_and_rate_limiting.sql
-- Narrative baseline migration 6 of 7, replacing original migrations 001-026.
-- Applied 2026-06-24 as part of migration squash; reconciled against live schema_migrations.
--
-- Scope: action_logs (with hardened, goal-ownership-enforced RLS as of
-- original migration 025), daily_ai_usage, ai_usage, consume_daily_ai_quota().
-- ============================================================================

-- action_logs -----------------------------------------------------------
create table public.action_logs (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references public.goals(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  action_text  text not null,
  status       text default 'pending' check (status in ('pending','complete','skipped')),
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz default now()
);

create index idx_action_logs_goal_created on public.action_logs (goal_id, created_at desc);
create index idx_action_logs_user_status on public.action_logs (user_id, status);

alter table public.action_logs enable row level security;

-- Hardened (final) policy state — original migration 025 replaced earlier,
-- looser SELECT/INSERT/UPDATE policies with these goal-ownership-enforced
-- versions. No intermediate version carried forward.
create policy "Users can view own action logs" on public.action_logs
  for select using (
    user_id = auth.uid()
    and exists (select 1 from public.goals g where g.id = action_logs.goal_id and g.user_id = auth.uid())
  );
create policy "Users can insert own action logs" on public.action_logs
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.goals g where g.id = action_logs.goal_id and g.user_id = auth.uid())
  );
create policy "Users can update own action logs" on public.action_logs
  for update using (
    user_id = auth.uid()
    and exists (select 1 from public.goals g where g.id = action_logs.goal_id and g.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.goals g where g.id = action_logs.goal_id and g.user_id = auth.uid())
  );

-- ai_usage ------------------------------------------------------------------
create table public.ai_usage (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  pipeline     text not null,
  model        text not null,
  input_tokens integer not null,
  output_tokens integer not null,
  latency_ms   integer not null,
  cached       boolean not null default false,
  error        text,
  created_at   timestamptz not null default now()
);

create index idx_ai_usage_user_id on public.ai_usage (user_id);
create index idx_ai_usage_pipeline on public.ai_usage (pipeline);

alter table public.ai_usage enable row level security;

-- Live state has NO select/insert policy on ai_usage (writes/reads happen via
-- service-role or SECURITY DEFINER paths, bypassing RLS) — only explicit
-- deny policies on update/delete. Reproducing exactly that, not adding
-- select/insert policies that don't exist live.
create policy "Users cannot update AI usage" on public.ai_usage
  for update using (false) with check (false);
create policy "Users cannot delete AI usage" on public.ai_usage
  for delete using (false);

-- daily_ai_usage --------------------------------------------------------
create table public.daily_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  count   integer not null default 0 check (count >= 0)
);

-- Live enforces uniqueness via a standalone unique index, not a table
-- constraint (so it has its own name rather than the default
-- daily_ai_usage_user_id_date_key).
create unique index idx_daily_ai_usage_user_date on public.daily_ai_usage (user_id, date);

alter table public.daily_ai_usage enable row level security;

-- Live state has only a SELECT policy — writes go exclusively through
-- consume_daily_ai_quota() below, which is SECURITY DEFINER and bypasses RLS.
-- No INSERT/UPDATE policy exists live; not adding one here.
create policy "Users can select own daily AI usage" on public.daily_ai_usage
  for select using (auth.uid() = user_id);

create or replace function public.consume_daily_ai_quota(
  p_date date,
  p_limit integer default 30
)
returns table (allowed boolean, count integer)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authenticated user required';
  end if;

  if p_limit <= 0 then
    raise exception 'Daily AI limit must be positive';
  end if;

  insert into public.daily_ai_usage (user_id, date, count)
  values (v_user_id, p_date, 1)
  on conflict (user_id, date) do update
    set count = public.daily_ai_usage.count + 1
    where public.daily_ai_usage.count < p_limit
  returning public.daily_ai_usage.count into v_count;

  if v_count is not null then
    return query select true, v_count;
    return;
  end if;

  select daily_ai_usage.count
  into v_count
  from public.daily_ai_usage
  where daily_ai_usage.user_id = v_user_id
    and daily_ai_usage.date = p_date;

  return query select false, coalesce(v_count, 0);
end;
$$;
