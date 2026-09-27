-- Migration 079: Projects V1.1 collaboration UX, lightweight Project Chat.
-- Project Chat is intentionally separate from contextual Task comments.

begin;

create or replace function public.project_role_has_capability_v11(p_role text, p_capability text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select case p_role
    when 'owner' then p_capability = any(array[
      'view_project','manage_project','manage_members','invite_members','transfer_ownership',
      'create_goal','edit_goal','assign_goal_lead','create_task','assign_task','complete_task',
      'create_milestone','edit_milestone','assign_milestone','view_shared_vault',
      'add_shared_content','comment','chat','view_shared_notes','view_shared_reflections'
    ])
    when 'admin' then p_capability = any(array[
      'view_project','manage_project','manage_members','invite_members',
      'assign_goal_lead','create_task','assign_task','complete_task','create_milestone',
      'edit_milestone','assign_milestone','view_shared_vault','add_shared_content','comment',
      'chat','view_shared_notes','view_shared_reflections'
    ])
    when 'member' then p_capability = any(array[
      'view_project','create_task','complete_task','create_milestone','view_shared_vault',
      'add_shared_content','comment','chat','view_shared_notes','view_shared_reflections'
    ])
    when 'guide' then p_capability = any(array[
      'view_project','assign_goal_lead','create_task','assign_task','complete_task',
      'create_milestone','edit_milestone','assign_milestone','view_shared_vault',
      'add_shared_content','comment','chat','view_shared_notes','view_shared_reflections'
    ])
    else false
  end;
$$;

-- Keep the client capability projection aligned with the canonical role matrix.
create or replace function public.get_project_collaboration_v11(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare v_role text; v_status text; v_result jsonb;
begin
  select pm.role, p.status into v_role, v_status
    from public.project_members pm
    join public.projects p on p.id = pm.project_id
   where pm.project_id = p_project_id and pm.user_id = auth.uid();
  if v_role is null then raise exception 'Project not found'; end if;
  select jsonb_build_object(
    'role', v_role,
    'capabilities', (select coalesce(jsonb_agg(capability), '[]'::jsonb) from unnest(array[
      'view_project','manage_project','manage_members','invite_members','transfer_ownership',
      'create_goal','edit_goal','assign_goal_lead','create_task','assign_task','complete_task',
      'create_milestone','edit_milestone','assign_milestone','view_shared_vault',
      'add_shared_content','comment','chat','view_shared_notes','view_shared_reflections'
    ]) capability where public.project_role_has_capability_v11(v_role, capability) and (v_status <> 'archived' or capability = 'view_project')),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
      'userId', pm.user_id, 'role', pm.role, 'relationshipLabel', pm.relationship_label,
      'displayName', coalesce(nullif(profile.display_name, ''), profile.username::text),
      'username', profile.username::text, 'avatarUrl', profile.avatar_url, 'joinedAt', pm.joined_at
    ) order by case pm.role when 'owner' then 0 when 'admin' then 1 when 'guide' then 2 else 3 end, pm.joined_at), '[]'::jsonb)
      from public.project_members pm join public.profiles profile on profile.id = pm.user_id where pm.project_id = p_project_id),
    'invitations', (case when public.project_role_has_capability_v11(v_role, 'manage_members') then
      (select coalesce(jsonb_agg(jsonb_build_object(
        'id', invitation.id, 'invitedUserId', invitation.invited_user_id, 'invitedEmail', invitation.invited_email,
        'role', invitation.role, 'relationshipLabel', invitation.relationship_label, 'status', invitation.status,
        'expiresAt', invitation.expires_at, 'createdAt', invitation.created_at
      ) order by invitation.created_at desc), '[]'::jsonb) from public.project_invitations invitation where invitation.project_id = p_project_id)
      else '[]'::jsonb end)
  ) into v_result;
  return v_result;
end;
$$;

-- Echo Entries remain owned by their creator. Project collaborators with the
-- existing add_shared_content capability may organize their own Note or
-- Reflection inside the Project, then opt into the existing explicit sharing
-- scope. Private remains the default.
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
    select 1 from public.projects project
     where project.id = p_project_id
       and project.status <> 'archived'
       and (
         project.user_id = auth.uid()
         or public.project_has_capability_v11(project.id, auth.uid(), 'add_shared_content')
       )
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

create table public.project_chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index project_chat_messages_project_time_idx
  on public.project_chat_messages(project_id, created_at desc);

alter table public.project_chat_messages enable row level security;

create policy "Project members can read chat" on public.project_chat_messages
  for select to authenticated using (
    deleted_at is null
    and public.project_has_capability_v11(project_id, auth.uid(), 'chat')
  );

revoke insert, update, delete on public.project_chat_messages from authenticated, anon;
grant select on public.project_chat_messages to authenticated;
grant select, insert, update, delete on public.project_chat_messages to service_role;

create or replace function public.create_project_chat_message_v11(p_project_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  if not public.project_has_capability_v11(p_project_id, auth.uid(), 'chat') then
    raise exception 'Not permitted';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;
  insert into public.project_chat_messages(project_id, author_id, body)
  values (p_project_id, auth.uid(), btrim(p_body)) returning id into v_id;
  insert into public.project_activity_events(project_id, actor_id, event_type, target_type, target_id, label)
  values (p_project_id, auth.uid(), 'chat.message_created', 'project_chat', v_id, 'Sent a Project Chat message');
  return v_id;
end;
$$;

create or replace function public.edit_project_chat_message_v11(p_message_id uuid, p_body text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;
  update public.project_chat_messages message
     set body = btrim(p_body), edited_at = now()
   where message.id = p_message_id
     and message.author_id = auth.uid()
     and message.deleted_at is null
     and public.project_has_capability_v11(message.project_id, auth.uid(), 'chat');
  return found;
end;
$$;

create or replace function public.delete_project_chat_message_v11(p_message_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.project_chat_messages message
     set deleted_at = now()
   where message.id = p_message_id
     and message.author_id = auth.uid()
     and message.deleted_at is null
     and public.project_has_capability_v11(message.project_id, auth.uid(), 'chat');
  return found;
end;
$$;

revoke all on function public.create_project_chat_message_v11(uuid, text) from public, anon;
revoke all on function public.edit_project_chat_message_v11(uuid, text) from public, anon;
revoke all on function public.delete_project_chat_message_v11(uuid) from public, anon;
grant execute on function public.create_project_chat_message_v11(uuid, text) to authenticated;
grant execute on function public.edit_project_chat_message_v11(uuid, text) to authenticated;
grant execute on function public.delete_project_chat_message_v11(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'project_chat_messages'
     ) then
    alter publication supabase_realtime add table public.project_chat_messages;
  end if;
end;
$$;

commit;
