-- ============================================================================
-- scripts/db-chain/supabase-platform.sql
--
-- The parts of a hosted Supabase database that exist *before* repository
-- migrations run, reproduced on plain PostgreSQL (no Docker, no Supabase CLI).
-- Applied once by scripts/db-chain/run.sh as the bootstrap superuser
-- supabase_admin; every repository migration after 001 then runs as the
-- non-superuser `postgres`, exactly as on hosted Supabase.
--
-- Scope: only what supabase/migrations/001..NNN depend on: platform roles,
-- the auth / storage / extensions schemas, auth.uid()/role()/jwt()/email(),
-- storage.foldername(), and Supabase's grants. Shapes follow the
-- supabase/postgres init scripts and GoTrue/storage-api schemas. Anything a
-- migration needs that is missing here is a harness gap, not a migration bug:
-- add it here with the upstream shape rather than patching a migration.
--
-- Known, deliberate differences from hosted (see scripts/db-chain/README.md):
--   * PostgreSQL 17 locally vs 15 hosted (CREATEROLE semantics differ; the
--     072, 074 and 075 executor-role pattern works under both).
--   * supautils is absent: run.sh lifts `postgres` to superuser for 001 only
--     (its event trigger needs it), then drops the attribute and hands the
--     event trigger to supabase_admin, which is what supautils does on hosted.
-- ============================================================================

\set ON_ERROR_STOP on

-- Platform roles -------------------------------------------------------------
-- run.sh has already created `postgres` (login createrole createdb
-- replication bypassrls, not a superuser, as on hosted) and the target
-- database owned by it.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login noinherit createrole;
create role supabase_storage_admin login noinherit createrole;
create role dashboard_user nologin createrole createdb replication;
-- Hosted lets postgres create policies on storage.objects and manage
-- anon/authenticated/service_role grants.
grant supabase_storage_admin to postgres;
grant anon, authenticated, service_role to postgres with admin option;

-- Database -------------------------------------------------------------------
-- run.sh creates the target database owned by postgres and connects to it.
alter database :"DBNAME" set search_path = "$user", public, extensions;
alter role anon set statement_timeout = '3s';
alter role authenticated set statement_timeout = '8s';
grant all on schema public to postgres, anon, authenticated, service_role;

-- Extensions -----------------------------------------------------------------
create schema extensions authorization supabase_admin;
grant usage on schema extensions to postgres, anon, authenticated, service_role;
grant all on schema extensions to postgres with grant option;
create extension "uuid-ossp" with schema extensions;
create extension pgcrypto with schema extensions;
-- pgvector is untrusted; hosted enables it through supautils/dashboard. 001's
-- `create extension if not exists vector` then no-ops, as it does on hosted.
create extension vector with schema extensions;
-- pg_cron is untrusted and preloaded on hosted; supautils/the dashboard create it and give postgres
-- the cron schema (Supabase's documented grants). 078's `create extension if not exists pg_cron` then
-- no-ops here, as it does on hosted once enabled.
create extension pg_cron;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- auth -----------------------------------------------------------------------
-- As upstream (and as read on hosted 2026-09-26): supabase_admin owns the schema,
-- supabase_auth_admin owns the objects in it.
create schema auth authorization supabase_admin;
grant all on schema auth to supabase_auth_admin;
set role supabase_auth_admin;

create table auth.users (
  instance_id uuid,
  id uuid not null primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token varchar(255),
  recovery_sent_at timestamptz,
  email_change_token_new varchar(255),
  email_change varchar(255),
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  phone text unique default null,
  phone_confirmed_at timestamptz,
  phone_change text default '',
  phone_change_token varchar(255) default '',
  phone_change_sent_at timestamptz,
  confirmed_at timestamptz generated always as (least(email_confirmed_at, phone_confirmed_at)) stored,
  email_change_token_current varchar(255) default '',
  email_change_confirm_status smallint default 0,
  banned_until timestamptz,
  reauthentication_token varchar(255) default '',
  reauthentication_sent_at timestamptz,
  is_sso_user boolean not null default false,
  deleted_at timestamptz,
  is_anonymous boolean not null default false
);
create unique index users_email_partial_key on auth.users (email) where is_sso_user = false;
alter table auth.users enable row level security;

-- PostgREST sets request.jwt.claims (JSON); older clients and many of our
-- tests set request.jwt.claim.<name>. Upstream auth.uid() accepts both.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;
create function auth.email() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

reset role;
-- Client roles may use the schema (and so call auth.uid()), but cannot read
-- auth tables. Roles created later by migrations get nothing: that is the
-- hosted behavior that made the goal-card executor (now 074) fail on auth.uid().
grant usage on schema auth to anon, authenticated, service_role, postgres, dashboard_user;
grant all on all tables in schema auth to postgres, dashboard_user;
grant execute on all functions in schema auth to postgres, dashboard_user;

-- storage --------------------------------------------------------------------
create schema storage authorization supabase_storage_admin;
set role supabase_storage_admin;

create table storage.buckets (
  id text not null primary key,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner_id text
);
create unique index bname on storage.buckets (name);

create table storage.objects (
  id uuid not null default gen_random_uuid() primary key,
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  version text,
  owner_id text,
  user_metadata jsonb
);
create unique index bucketid_objname on storage.objects (bucket_id, name);
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;

create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end
$$;
create function storage.filename(name text) returns text language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[array_length(_parts, 1)];
end
$$;
create function storage.extension(name text) returns text language plpgsql immutable as $$
declare _parts text[]; _filename text;
begin
  select string_to_array(name, '/') into _parts;
  select _parts[array_length(_parts, 1)] into _filename;
  return reverse(split_part(reverse(_filename), '.', 1));
end
$$;

reset role;
grant usage on schema storage to postgres, anon, authenticated, service_role;
grant all on all tables in schema storage to postgres, anon, authenticated, service_role;
grant all on all functions in schema storage to postgres, anon, authenticated, service_role;

-- Migration history ----------------------------------------------------------
-- As the Supabase CLI creates it (connected as postgres) on the first `db push`.
-- run.sh records each migration it applies here, so the chain carries the same
-- history as hosted and the hosted preflight/apply history guard runs locally.
create schema supabase_migrations authorization postgres;
set role postgres;
create table supabase_migrations.schema_migrations (version text not null primary key, statements text[], name text);
reset role;

-- Default privileges for objects migrations create --------------------------
-- DEFAULT_ACL=hosted (default): tables/functions/sequences created by postgres
-- in public are granted to the client roles, as on hosted projects. This is
-- the setting under which a forgotten REVOKE is a real exposure, so security
-- suites should pass here. DEFAULT_ACL=cli: no client grants, like a clean
-- `supabase db reset` (the case Migration 039 restores explicitly).
select :'DEFAULT_ACL' in ('hosted', 'cli') as default_acl_ok \gset
\if :default_acl_ok
\else
  \echo 'DEFAULT_ACL must be hosted or cli'
  select 1/0;
\endif
select :'DEFAULT_ACL' = 'hosted' as default_acl_hosted \gset
\if :default_acl_hosted
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
\endif
