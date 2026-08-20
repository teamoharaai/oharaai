-- Migration 042: Notes editor V2 storage and progress evidence
-- Adds private image storage and server-validated note progress evidence without
-- changing the existing entries or note-level Goal relationship ownership.

create or replace function public.set_entry_document_schema_version()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.schema_version := case
    when jsonb_typeof(new.content) = 'object'
      and new.content->>'schemaVersion' = '2' then 2
    else 1
  end;
  return new;
end;
$$;

revoke all on function public.set_entry_document_schema_version() from public, anon, authenticated;

drop trigger if exists entries_set_document_schema_version on public.entries;
create trigger entries_set_document_schema_version
before insert or update of content on public.entries
for each row execute function public.set_entry_document_schema_version();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-images',
  'note-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own note images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can insert own note images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own note images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own note images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table public.entry_goal_progress_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  reference_id text not null,
  block_id text,
  source_type text not null check (source_type in ('text', 'paragraph', 'checkbox')),
  excerpt text not null default '',
  checkbox_completed boolean not null default false,
  completion_count integer not null default 0 check (completion_count >= 0),
  reference_created_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_id, reference_id)
);

create index entry_goal_progress_evidence_goal_idx
  on public.entry_goal_progress_evidence (owner_id, goal_id, updated_at desc);

create table public.entry_goal_progress_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  reference_id text not null,
  block_id text,
  event_type text not null default 'note.progress_evidence_completed'
    check (event_type = 'note.progress_evidence_completed'),
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (entry_id, reference_id, occurred_at)
);

create index entry_goal_progress_events_goal_idx
  on public.entry_goal_progress_events (owner_id, goal_id, occurred_at desc);

alter table public.entry_goal_progress_evidence enable row level security;
alter table public.entry_goal_progress_events enable row level security;

create policy "Users can read own note progress evidence"
  on public.entry_goal_progress_evidence for select to authenticated
  using (owner_id = auth.uid());

create policy "Users can read own note progress events"
  on public.entry_goal_progress_events for select to authenticated
  using (owner_id = auth.uid());

revoke insert, update, delete on public.entry_goal_progress_evidence from anon, authenticated;
revoke insert, update, delete on public.entry_goal_progress_events from anon, authenticated;

create or replace function public.sync_entry_goal_progress_evidence(
  p_entry_id uuid,
  p_evidence jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_item jsonb;
  v_reference_id text;
  v_goal_id uuid;
  v_source_type text;
  v_previous_completed boolean;
  v_completed boolean;
  v_reference_exists boolean;
  v_document_checkbox_completed boolean;
  v_content jsonb;
  v_completion_count integer;
  v_now timestamptz := now();
begin
  if v_owner_id is null then raise exception 'Unauthorized'; end if;
  if jsonb_typeof(p_evidence) <> 'array' then raise exception 'Evidence must be an array'; end if;
  if jsonb_array_length(p_evidence) > 500 then raise exception 'Too many evidence references'; end if;
  if not exists (
    select 1 from public.entries e
    where e.id = p_entry_id and e.user_id = v_owner_id and e.entry_type = 'note'
  ) then raise exception 'Note not found'; end if;
  select content into v_content
  from public.entries
  where id = p_entry_id and user_id = v_owner_id;

  for v_item in select value from jsonb_array_elements(p_evidence) loop
    v_reference_id := nullif(btrim(v_item->>'referenceId'), '');
    v_goal_id := nullif(v_item->>'goalId', '')::uuid;
    v_source_type := v_item->>'sourceType';
    if v_reference_id is null or length(v_reference_id) > 200 then
      raise exception 'Invalid evidence reference';
    end if;
    if v_source_type is null or v_source_type not in ('text', 'paragraph', 'checkbox') then
      raise exception 'Invalid evidence source';
    end if;
    if not exists (
      select 1 from public.goals g
      where g.id = v_goal_id and g.user_id = v_owner_id and g.status <> 'archived'
    ) then raise exception 'Goal not found'; end if;

    -- The document is canonical. A caller cannot manufacture progress by
    -- supplying an evidence row or checkbox state that is absent from it.
    with recursive document_nodes(node, inside_completed_task) as (
      select v_content, false
      union all
      select
        child.value,
        case
          when document_nodes.node->>'type' = 'taskItem'
            then coalesce((document_nodes.node->'attrs'->>'checked')::boolean, false)
          else document_nodes.inside_completed_task
        end
      from document_nodes
      cross join lateral jsonb_array_elements(
        coalesce(document_nodes.node->'content', '[]'::jsonb)
      ) child
    ), matching_references as (
      select document_nodes.inside_completed_task
      from document_nodes
      cross join lateral jsonb_array_elements(
        coalesce(document_nodes.node->'marks', '[]'::jsonb)
      ) mark
      where mark->>'type' = 'goalReference'
        and mark->'attrs'->>'referenceId' = v_reference_id
        and mark->'attrs'->>'goalId' = v_goal_id::text
        and mark->'attrs'->>'sourceType' = v_source_type
        and mark->'attrs'->>'progressEvidence' = 'true'
    )
    select
      exists(select 1 from matching_references),
      coalesce(bool_or(inside_completed_task), false)
    into v_reference_exists, v_document_checkbox_completed
    from matching_references;
    if not v_reference_exists then raise exception 'Evidence reference is not present in note'; end if;
    v_completed := v_source_type = 'checkbox' and v_document_checkbox_completed;

    select checkbox_completed into v_previous_completed
    from public.entry_goal_progress_evidence
    where entry_id = p_entry_id and reference_id = v_reference_id;

    insert into public.entry_goal_progress_evidence (
      owner_id, entry_id, goal_id, reference_id, block_id, source_type,
      excerpt, checkbox_completed, completion_count, reference_created_at,
      completed_at, updated_at
    ) values (
      v_owner_id,
      p_entry_id,
      v_goal_id,
      v_reference_id,
      nullif(left(v_item->>'blockId', 200), ''),
      v_source_type,
      left(coalesce(v_item->>'excerpt', ''), 2000),
      v_completed,
      case when v_completed then 1 else 0 end,
      nullif(v_item->>'createdAt', '')::timestamptz,
      case when v_completed then v_now else null end,
      v_now
    )
    on conflict (entry_id, reference_id) do update set
      goal_id = excluded.goal_id,
      block_id = excluded.block_id,
      source_type = excluded.source_type,
      excerpt = excluded.excerpt,
      checkbox_completed = excluded.checkbox_completed,
      completion_count = public.entry_goal_progress_evidence.completion_count
        + case
          when excluded.checkbox_completed
            and not public.entry_goal_progress_evidence.checkbox_completed then 1
          else 0
        end,
      completed_at = case
        when excluded.checkbox_completed
          and not public.entry_goal_progress_evidence.checkbox_completed then v_now
        when not excluded.checkbox_completed then null
        else public.entry_goal_progress_evidence.completed_at
      end,
      updated_at = v_now
    returning completion_count into v_completion_count;

    if v_completed and coalesce(v_previous_completed, false) = false then
      insert into public.entry_goal_progress_events (
        owner_id, entry_id, goal_id, reference_id, block_id, occurred_at, payload
      ) values (
        v_owner_id,
        p_entry_id,
        v_goal_id,
        v_reference_id,
        nullif(left(v_item->>'blockId', 200), ''),
        v_now,
        jsonb_build_object(
          'sourceType', v_item->>'sourceType',
          'excerpt', left(coalesce(v_item->>'excerpt', ''), 2000),
          'completionSequence', v_completion_count,
          'planRevision', nullif(v_item->>'planRevision', '')
        )
      );
    end if;
  end loop;

  delete from public.entry_goal_progress_evidence existing
  where existing.entry_id = p_entry_id
    and not exists (
      select 1 from jsonb_array_elements(p_evidence) item
      where item->>'referenceId' = existing.reference_id
    );
end;
$$;

revoke all on function public.sync_entry_goal_progress_evidence(uuid, jsonb)
  from public, anon, authenticated;

create or replace function public.save_entry_v2(
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
  p_milestone_ids uuid[],
  p_expected_content_version integer,
  p_progress_evidence jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entry_id uuid;
  v_current_version integer;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_entry_id is not null and p_expected_content_version is null then
    raise exception 'Expected content version is required';
  end if;
  if p_entry_id is not null then
    select content_version into v_current_version
    from public.entries
    where id = p_entry_id and user_id = auth.uid()
    for update;
    if v_current_version is null then raise exception 'Entry not found'; end if;
    if v_current_version <> p_expected_content_version then
      raise exception 'Entry changed in another session. Reload before saving again.';
    end if;
  end if;

  v_entry_id := public.save_entry(
    p_entry_id,
    p_entry_type,
    p_title,
    p_content,
    p_plain_text,
    p_reflection_type,
    p_conversation_turns,
    p_takeaway,
    p_pinned,
    p_archived,
    p_completed_at,
    p_goal_ids,
    p_category_ids,
    p_milestone_ids
  );

  if p_entry_type = 'note' and p_content->>'schemaVersion' = '2' then
    perform public.sync_entry_goal_progress_evidence(
      v_entry_id,
      coalesce(p_progress_evidence, '[]'::jsonb)
    );
  end if;
  return v_entry_id;
end;
$$;

revoke all on function public.save_entry_v2(
  uuid, text, text, jsonb, text, text, jsonb, text, boolean, boolean,
  timestamptz, uuid[], text[], uuid[], integer, jsonb
) from public, anon, authenticated;
grant execute on function public.save_entry_v2(
  uuid, text, text, jsonb, text, text, jsonb, text, boolean, boolean,
  timestamptz, uuid[], text[], uuid[], integer, jsonb
) to authenticated;

grant select on public.entry_goal_progress_evidence to authenticated;
grant select on public.entry_goal_progress_events to authenticated;

comment on table public.entry_goal_progress_events is
  'Canonical note-originated progress evidence. Momentum may consume these events; Notes never updates Momentum directly.';
