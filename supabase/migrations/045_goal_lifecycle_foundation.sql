-- Migration 045: Goals V2.0 Phase 2A lifecycle foundation
-- Adds explicit expiration, lifecycle timestamps, deadline history, and
-- transactional same-goal extension / new-phase operations.

alter table public.goals
  drop constraint if exists goals_status_check;

alter table public.goals
  add constraint goals_status_check
  check (status in (
    'active', 'draft', 'complete', 'stagnant', 'discovered', 'archived', 'expired'
  ));

alter table public.goals
  add column if not exists completed_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists expired_at timestamptz;

create index if not exists idx_goals_user_status_deadline
  on public.goals (user_id, status, deadline);

create table public.goal_deadline_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  previous_deadline timestamptz,
  new_deadline timestamptz,
  changed_at timestamptz not null default now(),
  check (previous_deadline is distinct from new_deadline)
);

create index goal_deadline_history_goal_changed_idx
  on public.goal_deadline_history (user_id, goal_id, changed_at desc);

alter table public.goal_deadline_history enable row level security;

create policy "Users can view own Goal deadline history"
  on public.goal_deadline_history for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.goal_deadline_history from anon, authenticated;
revoke all on public.goal_deadline_history from anon;
grant select on public.goal_deadline_history to authenticated;
grant all on public.goal_deadline_history to service_role;

-- Repair the known duplicate-phase state before installing timestamp triggers.
-- The actual historical transition instant is unknown, so archived_at remains
-- null rather than inventing a timestamp.
update public.goals predecessor
set status = 'archived'
where predecessor.status = 'active'
  and exists (
    select 1
    from public.goals successor
    where successor.previous_goal_id = predecessor.id
      and successor.status = 'active'
  );

-- Reconcile pre-existing unresolved deadlines without fabricating expired_at.
update public.goals goal
set status = 'expired'
where goal.status = 'active'
  and goal.deadline is not null
  and goal.deadline < now()
  and not exists (
    select 1 from public.goals successor where successor.previous_goal_id = goal.id
  );

create or replace function public.apply_goal_lifecycle_metadata()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'complete' then
      new.completed_at := coalesce(new.completed_at, now());
    elsif new.status = 'archived' then
      new.archived_at := coalesce(new.archived_at, now());
    elsif new.status = 'expired' then
      new.expired_at := coalesce(new.expired_at, now());
    end if;
    new.updated_at := now();
  elsif new.deadline is distinct from old.deadline then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.apply_goal_lifecycle_metadata() from public, anon, authenticated;

create trigger goals_apply_lifecycle_metadata
  before update of status, deadline on public.goals
  for each row execute function public.apply_goal_lifecycle_metadata();

create or replace function public.record_goal_deadline_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.deadline is distinct from old.deadline then
    insert into public.goal_deadline_history (
      user_id, goal_id, previous_deadline, new_deadline, changed_at
    ) values (
      new.user_id, new.id, old.deadline, new.deadline, now()
    );
  end if;
  return new;
end;
$$;

revoke all on function public.record_goal_deadline_change() from public, anon, authenticated;

create trigger goals_record_deadline_change
  after update of deadline on public.goals
  for each row execute function public.record_goal_deadline_change();

create or replace function public.reconcile_goal_expiration_v1()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;

  update public.goals goal
  set status = 'expired'
  where goal.user_id = auth.uid()
    and goal.status = 'active'
    and goal.deadline is not null
    and goal.deadline < now()
    and not exists (
      select 1 from public.goals successor where successor.previous_goal_id = goal.id
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.reconcile_goal_expiration_v1() from public, anon;
grant execute on function public.reconcile_goal_expiration_v1() to authenticated;

create or replace function public.extend_goal_deadline_v1(
  p_goal_id uuid,
  p_new_deadline timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_goal public.goals;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_new_deadline is null or p_new_deadline <= now() then
    raise exception 'New deadline must be in the future';
  end if;

  select * into v_goal
  from public.goals
  where id = p_goal_id and user_id = auth.uid()
  for update;

  if v_goal.id is null then raise exception 'Goal not found'; end if;
  if v_goal.status not in ('active', 'expired') then
    raise exception 'Only active or expired Goals can be extended';
  end if;

  update public.goals
  set deadline = p_new_deadline,
      status = 'active'
  where id = v_goal.id;

  return v_goal.id;
end;
$$;

revoke all on function public.extend_goal_deadline_v1(uuid, timestamptz) from public, anon;
grant execute on function public.extend_goal_deadline_v1(uuid, timestamptz) to authenticated;

create or replace function public.start_goal_new_phase_v1(
  p_previous_goal_id uuid,
  p_deadline timestamptz,
  p_title text default null,
  p_reflection text default null,
  p_embedding_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous public.goals;
  v_goal_id uuid;
  v_summary jsonb;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_deadline is null or p_deadline <= now() then
    raise exception 'New phase deadline must be in the future';
  end if;

  select * into v_previous
  from public.goals
  where id = p_previous_goal_id and user_id = auth.uid()
  for update;

  if v_previous.id is null then raise exception 'Goal not found'; end if;
  if v_previous.status not in ('active', 'expired') then
    raise exception 'Only active or expired Goals can begin a new phase';
  end if;
  if exists (
    select 1 from public.goals where previous_goal_id = v_previous.id
  ) then
    raise exception 'Goal has already been extended' using errcode = '23505';
  end if;

  select coalesce(jsonb_agg(summary.item order by summary.sort_order), '[]'::jsonb)
  into v_summary
  from (
    select
      tracker.sort_order,
      case
        when tracker.type = 'counter' then jsonb_build_object(
          'title', tracker.title,
          'achieved', tracker.current_value,
          'target', tracker.target_value
        )
        when tracker.type = 'checklist' then jsonb_build_object(
          'title', tracker.title,
          'completions', case when tracker.current_value > 0 then 1 else 0 end
        )
        else jsonb_build_object(
          'title', tracker.title,
          'completions', (
            select count(*)
            from public.tracker_logs log
            where log.tracker_id = tracker.id
              and log.logged_at >= v_previous.created_at
              and (v_previous.deadline is null or log.logged_at <= v_previous.deadline)
          )
        )
      end as item
    from public.trackers tracker
    where tracker.goal_id = v_previous.id
  ) summary;

  insert into public.goals (
    user_id, title, description, category, smart_data, project_id, space_id,
    target_frequency, visibility, color_theme, embedding_text,
    previous_goal_id, deadline, prior_phase_summary, reflection, reflected_at,
    status, ai_generated
  ) values (
    v_previous.user_id,
    coalesce(nullif(btrim(p_title), ''), v_previous.title),
    v_previous.description,
    v_previous.category,
    v_previous.smart_data,
    v_previous.project_id,
    v_previous.space_id,
    v_previous.target_frequency,
    v_previous.visibility,
    v_previous.color_theme,
    p_embedding_text,
    v_previous.id,
    p_deadline,
    v_summary,
    nullif(btrim(p_reflection), ''),
    case when nullif(btrim(p_reflection), '') is null then null else now() end,
    'active',
    false
  ) returning id into v_goal_id;

  insert into public.trackers (
    goal_id, title, type, target_value, target_unit, frequency,
    current_value, is_ai_suggested, sort_order
  )
  select
    v_goal_id, title, type, target_value, target_unit, frequency,
    0, false, sort_order
  from public.trackers
  where goal_id = v_previous.id;

  insert into public.milestones (
    goal_id, user_id, title, description, due_date, sort_order, is_ai_suggested
  )
  select
    v_goal_id, v_previous.user_id, title, description, due_date, sort_order, false
  from public.milestones
  where goal_id = v_previous.id and completed_at is null;

  update public.goals
  set status = 'archived'
  where id = v_previous.id;

  return v_goal_id;
end;
$$;

revoke all on function public.start_goal_new_phase_v1(uuid, timestamptz, text, text, text)
  from public, anon;
grant execute on function public.start_goal_new_phase_v1(uuid, timestamptz, text, text, text)
  to authenticated;

-- Preserve an Entry's requested historical Goal links while still preventing
-- a caller from creating a new link to an unrelated inactive Goal.
create or replace function public.replace_entry_relationships(
  p_entry_id uuid,
  p_goal_ids uuid[],
  p_category_ids text[],
  p_milestone_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_valid_goal_ids uuid[];
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not exists (
    select 1 from public.entries e
    where e.id = p_entry_id and e.user_id = auth.uid()
  ) then
    raise exception 'Entry not found';
  end if;

  select coalesce(array_agg(distinct requested.goal_id), '{}'::uuid[])
  into v_valid_goal_ids
  from unnest(coalesce(p_goal_ids, '{}'::uuid[])) requested(goal_id)
  join public.goals goal on goal.id = requested.goal_id
  where goal.user_id = auth.uid()
    and (
      goal.status = 'active'
      or exists (
        select 1 from public.entry_goal_links existing
        where existing.entry_id = p_entry_id
          and existing.goal_id = goal.id
      )
    );

  delete from public.entry_goal_links where entry_id = p_entry_id;
  delete from public.entry_category_links where entry_id = p_entry_id;
  delete from public.reflection_milestone_links where entry_id = p_entry_id;

  insert into public.entry_goal_links (entry_id, goal_id)
  select p_entry_id, linked_goal_id
  from unnest(v_valid_goal_ids) linked(linked_goal_id)
  on conflict (entry_id, goal_id) do nothing;

  insert into public.entry_category_links (entry_id, category_id, link_source)
  select
    p_entry_id,
    case
      when goal.category = 'body' then 'health'
      when goal.category = 'mind' then 'education'
      when goal.category = 'money' then 'finance'
      when goal.category = 'create' then 'creative'
      when goal.category = 'connect' then 'relationships'
      when goal.category = 'contribute' then 'growth'
      else goal.category
    end,
    'inherited'
  from public.goals goal
  where goal.id = any(v_valid_goal_ids)
    and goal.user_id = auth.uid()
  on conflict (entry_id, category_id) do nothing;

  insert into public.entry_category_links (entry_id, category_id, link_source)
  select p_entry_id, linked_category_id, 'category_only'
  from unnest(coalesce(p_category_ids, '{}'::text[])) linked(linked_category_id)
  where linked_category_id in (
    'health', 'finance', 'career', 'creative', 'education', 'relationships', 'growth'
  )
  on conflict (entry_id, category_id) do nothing;

  insert into public.reflection_milestone_links (entry_id, milestone_id)
  select p_entry_id, linked_milestone_id
  from unnest(coalesce(p_milestone_ids, '{}'::uuid[])) linked(linked_milestone_id)
  where exists (
    select 1 from public.milestones milestone
    where milestone.id = linked_milestone_id and milestone.user_id = auth.uid()
  )
  on conflict (entry_id, milestone_id) do nothing;
end;
$$;

revoke all on function public.replace_entry_relationships(uuid, uuid[], text[], uuid[])
  from public;
grant execute on function public.replace_entry_relationships(uuid, uuid[], text[], uuid[])
  to authenticated;

-- Archived progress anchors remain valid only when the Entry already owns the
-- historical Goal relationship. This changes validation, not scoring.
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
  v_content jsonb;
  v_reference_id text;
  v_goal_id uuid;
  v_source_type text;
  v_reference_exists boolean;
  v_document_checkbox_completed boolean;
  v_previous_completed boolean;
  v_completed boolean;
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
      where g.id = v_goal_id
        and g.user_id = v_owner_id
        and (
          g.status = 'active'
          or exists (
            select 1 from public.entry_goal_links link
            where link.entry_id = p_entry_id and link.goal_id = g.id
          )
        )
    ) then raise exception 'Goal not found'; end if;

    -- The document is canonical. A caller cannot manufacture progress by
    -- supplying evidence that is absent from the stored Note document.
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
      owner_id, entry_id, goal_id, reference_id, block_id, source_type, excerpt,
      checkbox_completed, completion_count, reference_created_at, completed_at,
      created_at, updated_at
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
      case
        when nullif(v_item->>'createdAt', '') is null then null
        else (v_item->>'createdAt')::timestamptz
      end,
      case when v_completed then v_now else null end,
      v_now,
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
      select 1
      from jsonb_array_elements(p_evidence) item
      where item->>'referenceId' = existing.reference_id
    );
end;
$$;

revoke all on function public.sync_entry_goal_progress_evidence(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.sync_entry_goal_progress_evidence(uuid, jsonb)
  to authenticated;

comment on table public.goal_deadline_history is
  'Immutable per-Goal deadline revisions for lifecycle history and future Activity Events.';
