-- Migration 052: milestones become Ohara's meaning primitive.
--
-- Milestones split into two variants and gain evidence + hierarchy:
--   * kind = 'prep'        -> lightweight enabling step (buy running shoes)
--   * kind = 'achievement' -> proof of transformation; carries a hero photo,
--                             a surfaced reflection, and renders as a story card
-- An achievement milestone may declare a target_count and own sub-milestones
-- (children via parent_id) so "Cook 3 new recipes" can hold 3 postable recipes,
-- each an independently completable/photographable child. parent_id is a plain
-- self-reference, so deeper nesting is possible at the schema level even though
-- the UI constrains it to one level for now.
--
-- Social feed/profile surfaces remain Phase 2 (see CLAUDE.md). This migration
-- only builds the owner-private substrate those surfaces will later read.

-- Variant + hierarchy + evidence columns.
alter table public.milestones
  add column kind text not null default 'achievement'
    check (kind in ('prep', 'achievement')),
  add column parent_id uuid references public.milestones(id) on delete cascade,
  add column target_count integer
    check (target_count is null or target_count > 0),
  add column photo_url text;

-- Existing milestones were authored as meaningful critical events, not prep
-- steps; treat them as achievements so they render as story cards.
update public.milestones
set kind = 'achievement';

-- Sub-milestones are looked up by parent; index the edge.
create index idx_milestones_parent_id
  on public.milestones (parent_id);

comment on column public.milestones.kind is
  'prep = enabling checklist step; achievement = story-bearing accomplishment.';
comment on column public.milestones.parent_id is
  'Self-reference for sub-milestones. NULL means a top-level milestone.';
comment on column public.milestones.target_count is
  'Optional goal count for an achievement with sub-milestones (e.g. 3 recipes).';
comment on column public.milestones.photo_url is
  'Storage path of the hero evidence photo in the milestone-photos bucket.';

-- Owner-private photo evidence. Mirrors the note-images bucket (migration 042):
-- private bucket, 10 MB cap, common image mime types, first path segment is the
-- owner uid so RLS can scope objects to their owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'milestone-photos',
  'milestone-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own milestone photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'milestone-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can insert own milestone photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'milestone-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own milestone photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'milestone-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own milestone photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'milestone-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
