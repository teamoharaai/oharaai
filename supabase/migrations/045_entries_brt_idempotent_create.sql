-- Migration 045: canonical Entries BRT and idempotent creates
--
-- Migration 044 made canonical Entries optionally Project-organized through
-- save_entry_v3. Extend that contract rather than replacing it: one constrained
-- Bud/Rose/Thorn value belongs on the canonical Reflection Entry, and a
-- caller-generated UUID makes ambiguous mobile creates safe to retry per owner.

alter table public.entries
  add column if not exists brt_category text,
  add column if not exists client_request_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'entries_brt_category_check'
      and conrelid = 'public.entries'::regclass
  ) then
    alter table public.entries
      add constraint entries_brt_category_check
      check (brt_category is null or brt_category in ('bud', 'rose', 'thorn'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'entries_brt_reflection_only_check'
      and conrelid = 'public.entries'::regclass
  ) then
    alter table public.entries
      add constraint entries_brt_reflection_only_check
      check (entry_type = 'reflection' or brt_category is null);
  end if;
end;
$$;

create unique index if not exists entries_owner_client_request_idx
  on public.entries (user_id, client_request_id)
  where client_request_id is not null;

-- Migration 036 preserved legacy Echo IDs. Bring their canonical category onto
-- the unified row once; no ongoing dual-write or cross-table dependency remains.
update public.entries entry
set brt_category = echo.brt_category
from public.echo_entries echo
where entry.id = echo.id
  and entry.user_id = echo.user_id
  and entry.entry_type = 'reflection'
  and entry.brt_category is null
  and echo.brt_category in ('bud', 'rose', 'thorn');

create or replace function public.touch_entry_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Older V2/V3 callers can still change an Entry's type. Normalize the one
  -- transition that would otherwise violate the new reflection-only BRT check.
  if old.entry_type = 'reflection' and new.entry_type = 'note' then
    new.brt_category := null;
  end if;

  if (
    new.entry_type,
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
    new.project_id,
    new.brt_category
  ) is distinct from (
    old.entry_type,
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
    old.project_id,
    old.brt_category
  ) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Keep V2 and Project-aware V3 intact for deployed clients. V4 delegates the
-- complete V3 transaction, then adds BRT and the create key in the same database
-- transaction. A uniqueness race rolls back the losing insert before returning
-- the winning owner row.
create or replace function public.save_entry_v4(
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
  p_progress_evidence jsonb,
  p_brt_category text,
  p_brt_category_provided boolean,
  p_client_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_entry_id uuid;
  v_existing_type text;
begin
  if v_owner_id is null then raise exception 'Unauthorized'; end if;
  if p_brt_category is not null and p_brt_category not in ('bud', 'rose', 'thorn') then
    raise exception 'Invalid BRT category';
  end if;
  if p_entry_type <> 'reflection' and p_brt_category is not null then
    raise exception 'Only reflections can have a BRT category';
  end if;

  if p_entry_id is null and p_client_request_id is not null then
    select id, entry_type into v_entry_id, v_existing_type
    from public.entries
    where user_id = v_owner_id and client_request_id = p_client_request_id;
    if v_entry_id is not null then
      if v_existing_type <> p_entry_type then
        raise exception 'Client request ID belongs to another entry type';
      end if;
      return v_entry_id;
    end if;
  end if;

  v_entry_id := public.save_entry_v3(
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
    p_project_id,
    p_expected_content_version,
    p_progress_evidence
  );

  update public.entries
  set
    brt_category = case
      when p_entry_type <> 'reflection' then null
      when p_brt_category_provided then p_brt_category
      else brt_category
    end,
    client_request_id = case
      when p_entry_id is null then p_client_request_id
      else client_request_id
    end
  where id = v_entry_id and user_id = v_owner_id;

  return v_entry_id;
exception
  when unique_violation then
    if p_entry_id is null and p_client_request_id is not null then
      select id, entry_type into v_entry_id, v_existing_type
      from public.entries
      where user_id = v_owner_id and client_request_id = p_client_request_id;
      if v_entry_id is not null and v_existing_type = p_entry_type then
        return v_entry_id;
      end if;
    end if;
    raise;
end;
$$;

revoke all on function public.save_entry_v4(
  uuid, text, text, jsonb, text, text, jsonb, text, boolean, boolean,
  timestamptz, uuid[], text[], uuid[], uuid, integer, jsonb, text, boolean, uuid
) from public, anon, authenticated;
grant execute on function public.save_entry_v4(
  uuid, text, text, jsonb, text, text, jsonb, text, boolean, boolean,
  timestamptz, uuid[], text[], uuid[], uuid, integer, jsonb, text, boolean, uuid
) to authenticated;

comment on column public.entries.brt_category is
  'Canonical Bud, Rose, or Thorn category for a Reflection Entry.';
comment on column public.entries.client_request_id is
  'Owner-scoped idempotency key for create retries.';
