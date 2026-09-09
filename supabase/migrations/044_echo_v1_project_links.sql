-- Migration 044: Echo V1 optional Project organization
--
-- Adds a single optional Project folder relationship to the canonical Entries
-- domain. Existing Entries and legacy Echo rows remain untouched. The V3 save
-- wrapper keeps the Project assignment in the same transaction as content,
-- Goal/category/milestone relationships, and Notes V2 progress evidence.

alter table public.entries
  add column project_id uuid references public.projects(id) on delete set null;

create index entries_user_project_updated_idx
  on public.entries (user_id, project_id, updated_at desc)
  where archived = false and project_id is not null;

create or replace function public.touch_entry_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    new.title,
    new.content,
    new.plain_text,
    new.reflection_type,
    new.conversation_turns,
    new.takeaway,
    new.pinned,
    new.archived,
    new.content_version,
    new.completed_at,
    new.project_id
  ) is distinct from (
    old.title,
    old.content,
    old.plain_text,
    old.reflection_type,
    old.conversation_turns,
    old.takeaway,
    old.pinned,
    old.archived,
    old.content_version,
    old.completed_at,
    old.project_id
  ) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.save_entry_v3(
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
  p_project_id uuid,
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
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_project_id is not null and not exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.user_id = auth.uid()
      and p.status <> 'archived'
  ) then
    raise exception 'Invalid Project';
  end if;

  v_entry_id := public.save_entry_v2(
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
    p_milestone_ids,
    p_expected_content_version,
    p_progress_evidence
  );

  update public.entries
  set project_id = p_project_id
  where id = v_entry_id and user_id = auth.uid();

  return v_entry_id;
end;
$$;

revoke all on function public.save_entry_v3(
  uuid, text, text, jsonb, text, text, jsonb, text, boolean, boolean,
  timestamptz, uuid[], text[], uuid[], uuid, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.save_entry_v3(
  uuid, text, text, jsonb, text, text, jsonb, text, boolean, boolean,
  timestamptz, uuid[], text[], uuid[], uuid, integer, jsonb
) to authenticated;

comment on column public.entries.project_id is
  'Optional Echo folder organization. The Entry remains canonical and is not duplicated into Projects.';
