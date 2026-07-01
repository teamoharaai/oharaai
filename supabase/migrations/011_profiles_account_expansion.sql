-- ============================================================================
-- 011_profiles_account_expansion.sql
-- Additive/rename only. Does not touch 001-010.
--
-- Scope: Account screen expansion.
--   1. Renames profiles.interests -> interests_user (disambiguates from the
--      new system-inferred interests_ai column below).
--   2. Adds avatar_url, bio, interests_ai, intelligence_enabled to profiles.
--   3. Creates the `avatars` public storage bucket with owner-scoped write
--      policies.
--
-- Out of scope: handle_new_user() and on_auth_user_created were fixed
-- manually via SQL Editor this session and are not touched here.
-- interests_ai is schema-only — no writer exists yet. Do not expose it via
-- any client-writable API route.
-- ============================================================================

alter table public.profiles
  rename column interests to interests_user;

alter table public.profiles
  add column if not exists avatar_url text default null,
  add column if not exists bio text default null,
  add column if not exists interests_ai jsonb default null,
  add column if not exists intelligence_enabled boolean not null default true;

comment on column public.profiles.interests_user is
  'User-managed interest tags. Editable via Account screen.';
comment on column public.profiles.interests_ai is
  'System-inferred interests from Echo patterns. Schema-only — no writer exists yet. Do not expose via any client-writable API route.';
comment on column public.profiles.intelligence_enabled is
  'When false, reflect API skips Haiku call and sets ai_status = not_requested.';

-- avatars storage bucket ------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
