\set ON_ERROR_STOP on

create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists storage;

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

create function auth.uid()
returns uuid
language sql
stable
as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';

grant usage on schema auth, public, storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table auth.users (id uuid primary key);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);
create table public.goals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null
);
create table public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active'
);
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null,
  title text not null default '',
  content jsonb not null,
  plain_text text not null default '',
  reflection_type text,
  conversation_turns jsonb not null default '[]'::jsonb,
  takeaway text,
  pinned boolean not null default false,
  archived boolean not null default false,
  completed_at timestamptz,
  content_version integer not null default 1,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.echo_entries (
  id uuid primary key references public.entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  brt_category text
);

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null
);
alter table storage.objects enable row level security;

create function storage.foldername(path text)
returns text[]
language sql
immutable
as 'select string_to_array(path, ''/'')';
grant execute on function storage.foldername(text) to anon, authenticated;

create or replace function public.save_entry(
  p_entry_id uuid,
  p_entry_type text,
  p_title text,
  p_content jsonb,
  p_plain_text text,
  p_reflection_type text,
  p_conversation_turns jsonb,
  p_takeaway text,
  p_pinned boolean,
  p_archived boolean,
  p_completed_at timestamptz,
  p_goal_ids uuid[],
  p_category_ids text[],
  p_milestone_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;

  if p_entry_id is null then
    insert into public.entries (
      user_id,
      entry_type,
      title,
      content,
      plain_text,
      reflection_type,
      conversation_turns,
      takeaway,
      pinned,
      archived,
      completed_at
    ) values (
      auth.uid(),
      p_entry_type,
      p_title,
      p_content,
      p_plain_text,
      p_reflection_type,
      p_conversation_turns,
      p_takeaway,
      p_pinned,
      p_archived,
      p_completed_at
    )
    returning id into v_entry_id;
  else
    update public.entries
    set entry_type = p_entry_type,
        title = p_title,
        content = p_content,
        plain_text = p_plain_text,
        reflection_type = p_reflection_type,
        conversation_turns = p_conversation_turns,
        takeaway = p_takeaway,
        pinned = p_pinned,
        archived = p_archived,
        completed_at = p_completed_at,
        content_version = content_version + 1
    where id = p_entry_id and user_id = auth.uid()
    returning id into v_entry_id;
    if v_entry_id is null then raise exception 'Entry not found'; end if;
  end if;

  return v_entry_id;
end;
$$;
