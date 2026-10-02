-- Echo -> canonical Entries mirror (TD-005 D3, B3/B4/B10). Design: design/ios-core/TD-005-desktop-work-cutover.md
-- (iOS repo), agreed 2026-09-29. Planned there as "082"; Arthur's 082-085 took those numbers first.
--
-- * Every Echo write now also writes its canonical Entry in the same transaction, so desktop Echo captures,
--   edits, moves and deletes reach native Reflections, goal_events (080) and goal_activity_v1. AFTER row triggers
--   on echo_entries and echo_entry_links call ONE mapping function, so every writer is covered without editing
--   TypeScript: create_echo_entry_with_container (023, also the session pipeline), the PATCH/DELETE routes,
--   moveEntryContainer, FK cascades. The Echo UI, Constellation and the reflect/reconcile pipeline keep reading
--   echo_entries unchanged.
-- * The mapping is 036's (same ID; a completed 'open' Reflection whose one-paragraph body and single user turn are
--   the Echo text; title defaulting to 'Reflection'), with two corrections found while building it:
--     - the goal link is the Goal Echo itself shows: the entry's confirmed container if it has one (a goal; a
--       folder means no Goal), otherwise the legacy echo_entries.goal_id (desktop's applyContainer rule). A move
--       never clears echo_entries.goal_id, so 036's "confirmed links plus goal_id" would keep a moved entry on
--       its old Goal; B4 requires the move to remove it. Unconfirmed AI suggestions never count. Only the
--       owner's Goals count, as in 080;
--     - inherited category links copy the Goal's product category (068), not 036's pre-068 remap.
--     - the user's Bud/Rose/Thorn choice (echo_entries.brt_category, written only by the Echo PATCH route) is
--       mirrored too: 045 made it the copy's canonical BRT, and native shows it.
-- * Only the Echo text, its BRT category, the goal link and its inherited category are mirrored. AI fields
--   (ai_status, brt, emotion, embeddings, processed_at, 083's reconcile leases) are not, and WHEN clauses keep those
--   updates from firing.
-- * Echo owns these Entries (B5/B10): a canonical insert, update or delete of an Entry whose ID is in
--   echo_entries, or of its Goal/category/Milestone links, fails with ECHO_OWNED. That covers save_entry v1-v4,
--   replace_entry_relationships, set_entry_project_share_v11 and direct RLS writes (the desktop library route,
--   native, the service role). Only the mirror itself (which runs as goal_manual_executor, a role no client can
--   assume) and writes nested in another trigger (FK cascades, e.g. deleting a Goal or an account) pass.
-- * Backlog, once: Echo entries with no canonical row, and missing goal links, are copied through the same
--   function in add-only mode. It never overwrites or unlinks an existing canonical row, so existing goal_events
--   rows are untouched; copied links add goal_events rows for Echo-origin Entries only (the --apply invariant
--   allows exactly that). The preflight's 086 pre-check reports both counts first.
-- Desktop-visible: Echo-origin Entries become read-only in the Entries library (desktop shows "Edit in Echo").
-- Depends on 002/012/023/036/068/080/083.
begin;
-- Hosted migrations run as a non-superuser; ownership transfer needs temporary membership (see 072).
grant goal_manual_executor to current_user;
grant create on schema public, goal_private to goal_manual_executor;

-- Mapping -----------------------------------------------------------------------------------------------
-- The Goal each Echo entry belongs to, as Echo shows it, with that Goal's category.
create function goal_private.echo_entry_goals(entry_ids uuid[])
returns table (entry_id uuid, goal_id uuid, category text, linked_at timestamptz)
language sql stable set search_path = pg_catalog, public, goal_private as $$
  select ee.id, g.id, g.category, coalesce(container.created_at, ee.created_at)
  from public.echo_entries ee
  left join lateral (
    select l.container_type, l.goal_id, l.created_at from public.echo_entry_links l
    where l.echo_entry_id = ee.id and l.confirmed order by l.created_at, l.id limit 1
  ) container on true
  join public.goals g on g.user_id = ee.user_id
    and g.id = case when container.container_type is null then ee.goal_id
                    when container.container_type = 'goal' then container.goal_id end
  where ee.id = any(entry_ids);
$$;

-- Makes the canonical copies of these Echo entries match them. refresh = true (the triggers): rewrite the text,
-- relink, and delete copies whose Echo row is gone. refresh = false (the backlog): add what is missing only.
create function goal_private.mirror_echo_entries(entry_ids uuid[], refresh boolean) returns void
language plpgsql security definer set search_path = pg_catalog, public, goal_private as $$
begin
  if refresh then
    delete from public.entries e
    where e.id = any(entry_ids) and not exists (select 1 from public.echo_entries ee where ee.id = e.id);
  end if;

  insert into public.entries as e (id, user_id, entry_type, title, content, plain_text, reflection_type,
    conversation_turns, brt_category, completed_at, created_at, updated_at)
  select ee.id, ee.user_id, 'reflection', coalesce(nullif(btrim(ee.title), ''), 'Reflection'),
    jsonb_build_object('type', 'doc', 'blocks', jsonb_build_array(
      jsonb_build_object('id', ee.id::text || '-body', 'type', 'paragraph', 'text', ee.content))),
    ee.content, 'open',
    jsonb_build_array(jsonb_build_object('id', ee.id::text || '-response', 'role', 'user',
      'content', ee.content, 'createdAt', ee.created_at)),
    ee.brt_category, coalesce(ee.processed_at, ee.created_at), ee.created_at, coalesce(ee.processed_at, ee.created_at)
  from public.echo_entries ee
  where ee.id = any(entry_ids)
  on conflict (id) do update set
    entry_type = excluded.entry_type, reflection_type = excluded.reflection_type, title = excluded.title,
    content = excluded.content, plain_text = excluded.plain_text, conversation_turns = excluded.conversation_turns,
    brt_category = excluded.brt_category, content_version = e.content_version + 1
  where refresh
    and (e.entry_type, e.reflection_type, e.title, e.content, e.plain_text, e.conversation_turns, e.brt_category)
      is distinct from (excluded.entry_type, excluded.reflection_type, excluded.title, excluded.content,
                        excluded.plain_text, excluded.conversation_turns, excluded.brt_category);

  if refresh then
    delete from public.entry_goal_links l
    where l.entry_id = any(entry_ids)
      and not exists (select 1 from goal_private.echo_entry_goals(entry_ids) w
                      where w.entry_id = l.entry_id and w.goal_id = l.goal_id);
    delete from public.entry_category_links c
    where c.entry_id = any(entry_ids) and c.link_source = 'inherited'
      and not exists (select 1 from goal_private.echo_entry_goals(entry_ids) w
                      where w.entry_id = c.entry_id and w.category = c.category_id);
  end if;
  insert into public.entry_goal_links (entry_id, goal_id, created_at)
  select w.entry_id, w.goal_id, w.linked_at from goal_private.echo_entry_goals(entry_ids) w
  on conflict (entry_id, goal_id) do nothing;
  insert into public.entry_category_links (entry_id, category_id, link_source, created_at)
  select w.entry_id, w.category, 'inherited', w.linked_at from goal_private.echo_entry_goals(entry_ids) w
  on conflict (entry_id, category_id) do nothing;
end $$;

-- Backlog ------------------------------------------------------------------------------------------------
-- Before the guard exists (it would refuse these statement-level writes) and before the triggers.
select goal_private.mirror_echo_entries(array(select id from public.echo_entries), false);

-- Triggers -----------------------------------------------------------------------------------------------
create function goal_private.echo_entry_mirror() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, goal_private as $$
begin
  perform goal_private.mirror_echo_entries(array[coalesce(new.id, old.id)], true);
  return null;
end $$;

create function goal_private.echo_link_mirror() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, goal_private as $$
begin
  perform goal_private.mirror_echo_entries(array_remove(array[old.echo_entry_id, new.echo_entry_id], null), true);
  return null;
end $$;

create trigger echo_mirror_insert after insert on public.echo_entries
  for each row execute function goal_private.echo_entry_mirror();
create trigger echo_mirror_update after update of title, content, brt_category, goal_id on public.echo_entries
  for each row when ((old.title, old.content, old.brt_category, old.goal_id)
    is distinct from (new.title, new.content, new.brt_category, new.goal_id))
  execute function goal_private.echo_entry_mirror();
create trigger echo_mirror_delete after delete on public.echo_entries
  for each row execute function goal_private.echo_entry_mirror();

-- Only confirmed links decide the container; the pipeline's unconfirmed suggestions never call the mirror.
create trigger echo_mirror_link_insert after insert on public.echo_entry_links
  for each row when (new.confirmed) execute function goal_private.echo_link_mirror();
create trigger echo_mirror_link_update after update of echo_entry_id, container_type, goal_id, folder_id, confirmed
  on public.echo_entry_links
  for each row when ((old.confirmed or new.confirmed)
    and (old.echo_entry_id, old.container_type, old.goal_id, old.folder_id, old.confirmed)
      is distinct from (new.echo_entry_id, new.container_type, new.goal_id, new.folder_id, new.confirmed))
  execute function goal_private.echo_link_mirror();
create trigger echo_mirror_link_delete after delete on public.echo_entry_links
  for each row when (old.confirmed) execute function goal_private.echo_link_mirror();

-- Echo owns its Entries (B10) ------------------------------------------------------------------------------
create function goal_private.refuse_echo_owned_write() returns trigger
-- Security invoker: current_user is whoever issued the write. An owner's own Echo rows are visible to it under RLS.
language plpgsql security invoker set search_path = pg_catalog, public, goal_private as $$
declare
  ids uuid[];
begin
  if current_user <> 'goal_manual_executor' and pg_trigger_depth() = 1 then
    -- Separate statements: each is parsed against this table's row type only when it runs.
    if tg_table_name = 'entries' then ids := array[old.id, new.id]; else ids := array[old.entry_id, new.entry_id]; end if;
    if exists (select 1 from public.echo_entries ee where ee.id = any(ids)) then
      raise exception 'ECHO_OWNED: this Entry was captured in Echo and can only be changed there'
        using hint = 'Edit or delete it in Echo.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger echo_owned_guard before insert or update or delete on public.entries
  for each row execute function goal_private.refuse_echo_owned_write();
create trigger echo_owned_guard before insert or update or delete on public.entry_goal_links
  for each row execute function goal_private.refuse_echo_owned_write();
create trigger echo_owned_guard before insert or update or delete on public.entry_category_links
  for each row execute function goal_private.refuse_echo_owned_write();
create trigger echo_owned_guard before insert or update or delete on public.reflection_milestone_links
  for each row execute function goal_private.refuse_echo_owned_write();

-- Grants -------------------------------------------------------------------------------------------------
grant select on public.echo_entries, public.echo_entry_links, public.goals to goal_manual_executor;
grant select, insert, update, delete on public.entries, public.entry_goal_links, public.entry_category_links
  to goal_manual_executor;
alter function goal_private.echo_entry_goals(uuid[]) owner to goal_manual_executor;
alter function goal_private.mirror_echo_entries(uuid[], boolean) owner to goal_manual_executor;
alter function goal_private.echo_entry_mirror() owner to goal_manual_executor;
alter function goal_private.echo_link_mirror() owner to goal_manual_executor;
revoke all on function goal_private.echo_entry_goals(uuid[]), goal_private.mirror_echo_entries(uuid[], boolean),
  goal_private.echo_entry_mirror(), goal_private.echo_link_mirror(), goal_private.refuse_echo_owned_write()
  from public, anon, authenticated, service_role;

revoke create on schema public, goal_private from goal_manual_executor;
revoke goal_manual_executor from current_user;
commit;
