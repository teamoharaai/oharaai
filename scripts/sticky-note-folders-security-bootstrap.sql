-- Minimal, production-shaped schema so migrations 065 + 066 apply against a
-- disposable local PostgreSQL cluster (see test-sticky-note-folders-security.sh).
-- Recreates only what the folder migrations depend on: an auth.uid() shim, the
-- authenticated/anon roles, goals, the vaults + vault_items tables with their
-- owner-scoped RLS, and the handle_updated_at() trigger helper. Never reads .env
-- or contacts a linked/live Supabase project.
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
end
$$;

-- Same shim the other security bootstraps use: auth.uid() reads the request's
-- JWT subject from a GUC the test flips per-user with set_config().
create function auth.uid()
returns uuid
language sql
stable
as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';

grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table auth.users (id uuid primary key);

create table public.goals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active'
);

-- Trigger helper migration 065 attaches to vault_note_folders.
create function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- Vaults: one per goal, owner-scoped (matches the live shape the folder
-- migrations reference).
create table public.vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null unique references public.goals(id) on delete cascade,
  space_id uuid,
  vault_type text not null default 'personal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vaults enable row level security;
create policy "Owners manage own vaults" on public.vaults
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on table public.vaults to authenticated;

-- Vault items (the notes carrier). RLS is scoped through the owning vault, which
-- is what the app enforces; only the columns the folder migrations touch matter.
create table public.vault_items (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  item_type text not null,
  title text,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  visibility text not null default 'private',
  created_by uuid not null references auth.users(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vault_items enable row level security;
create policy "Owners manage items in own vaults" on public.vault_items
  for all
  using (exists (select 1 from public.vaults v where v.id = vault_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vaults v where v.id = vault_id and v.user_id = auth.uid()));
grant select, insert, update, delete on table public.vault_items to authenticated;
