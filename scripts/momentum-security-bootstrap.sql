\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

do $$
begin
  if to_regclass('auth.users') is null then
    execute 'create table auth.users (id uuid primary key)';
  end if;
  if to_regprocedure('auth.uid()') is null then
    execute $function$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid'
    $function$;
  end if;
  if to_regprocedure('auth.role()') is null then
    execute $function$
      create function auth.role()
      returns text
      language sql
      stable
      as 'select nullif(current_setting(''request.jwt.claim.role'', true), '''')'
    $function$;
  end if;

  if exists (
    select 1
    from pg_namespace
    where nspname = 'auth' and nspowner = (select oid from pg_roles where rolname = current_user)
  ) then
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    grant execute on function auth.role() to anon, authenticated, service_role;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC'
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active'
    check (status in ('active', 'draft', 'complete', 'stagnant', 'discovered', 'archived'))
);

create table if not exists public.action_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_text text not null,
  status text default 'pending' check (status in ('pending', 'complete', 'skipped')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.action_logs enable row level security;

create policy "Harness users can read own profile" on public.profiles
  for select using (id = auth.uid());
create policy "Harness users can read own goals" on public.goals
  for select using (user_id = auth.uid());
create policy "Harness users can read own actions" on public.action_logs
  for select using (
    user_id = auth.uid()
    and exists (
      select 1 from public.goals
      where goals.id = action_logs.goal_id and goals.user_id = auth.uid()
    )
  );
