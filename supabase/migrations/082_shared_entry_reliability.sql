-- Phase 1 shared Entry reliability: authorize embedded Note images through the
-- same Entry RLS decision as the detail row, and support the Project workspace's
-- active Entries query without changing privacy or mutation semantics.
begin;

create index if not exists entries_project_active_updated_idx
  on public.entries (project_id, updated_at desc)
  where archived = false;

drop policy if exists "Project collaborators can read shared note images" on storage.objects;
create policy "Project collaborators can read shared note images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'note-images'
    and coalesce(array_length(storage.foldername(name), 1), 0) >= 2
    and exists (
      select 1
      from public.entries e
      where e.id::text = (storage.foldername(name))[2]
        and e.user_id::text = (storage.foldername(name))[1]
        and e.entry_type = 'note'
    )
  );

-- Read-only image access follows public.entries SELECT RLS. Private, unshared,
-- and removed-member Entries remain inaccessible.

commit;
