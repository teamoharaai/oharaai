-- Migration 058: goal sticky notes.
--
-- Sticky notes are owner-private, goal-bound freeform notes authored inline on
-- the goal detail "Notes" tab. They mirror milestones (own table, hero photo via
-- a private storage bucket) but carry no completion state or hierarchy — just a
-- title, an optional body, and an optional photo. They are NOT surfaced in
-- Circles and are not a Momentum signal. The card "date" is created_at.

create table public.goal_notes (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  photo_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goal_notes enable row level security;

-- Owner-scoped CRUD, matching the milestones policy shape (migration 001).
create policy "Users can select own goal notes" on public.goal_notes
  for select using (user_id = auth.uid());
create policy "Users can insert own goal notes" on public.goal_notes
  for insert with check (user_id = auth.uid());
create policy "Users can update own goal notes" on public.goal_notes
  for update using (user_id = auth.uid());
create policy "Users can delete own goal notes" on public.goal_notes
  for delete using (user_id = auth.uid());

-- Notes are looked up by goal; index the edge.
create index idx_goal_notes_goal_id
  on public.goal_notes (goal_id);

create trigger goal_notes_updated_at
  before update on public.goal_notes
  for each row execute function public.handle_updated_at();

-- Explicit privileges (migration 039 convention: PostgREST relies on these).
grant select, insert, update, delete on table public.goal_notes to authenticated;

comment on table public.goal_notes is
  'Owner-private freeform sticky notes bound to a goal. created_at is the card date.';
comment on column public.goal_notes.photo_url is
  'Storage path of the hero photo in the goal-note-photos bucket.';

-- Owner-private photo evidence. Mirrors the milestone-photos bucket
-- (migration 052): private bucket, 10 MB cap, common image mime types, first
-- path segment is the owner uid so RLS can scope objects to their owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'goal-note-photos',
  'goal-note-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own goal note photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'goal-note-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can insert own goal note photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'goal-note-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own goal note photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'goal-note-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own goal note photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'goal-note-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
