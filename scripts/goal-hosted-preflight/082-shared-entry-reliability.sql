-- Migration 082 is intentionally schema-only. Verify its narrow read policy and
-- Project Entry index without reading or mutating user content.
do $$
declare
  index_definition text;
  index_predicate text;
  policy_qual text;
begin
  select pg_get_indexdef(i.indexrelid), pg_get_expr(i.indpred, i.indrelid)
    into index_definition, index_predicate
    from pg_index i
    join pg_class idx on idx.oid = i.indexrelid
    join pg_class tbl on tbl.oid = i.indrelid
    join pg_namespace ns on ns.oid = tbl.relnamespace
   where ns.nspname = 'public'
     and tbl.relname = 'entries'
     and idx.relname = 'entries_project_active_updated_idx';

  if index_definition is null
     or index_definition not like '%(project_id, updated_at DESC)%'
     or index_predicate <> '(archived = false)' then
    raise exception 'SHARED_ENTRY_INDEX_INVALID: definition %, predicate %', index_definition, index_predicate;
  end if;

  select qual into policy_qual
    from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'Project collaborators can read shared note images'
     and cmd = 'SELECT'
     and roles = array['authenticated']::name[];

  if policy_qual is null
     or policy_qual not like '%note-images%'
     or policy_qual not like '%storage.foldername%'
     or policy_qual not like '%FROM entries%'
     or policy_qual not like '%entry_type%note%' then
    raise exception 'SHARED_ENTRY_IMAGE_POLICY_INVALID: %', policy_qual;
  end if;

  if exists (
    select 1 from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname = 'Project collaborators can read shared note images'
       and cmd <> 'SELECT'
  ) then
    raise exception 'SHARED_ENTRY_IMAGE_POLICY_WRITE_ACCESS';
  end if;
end $$;
