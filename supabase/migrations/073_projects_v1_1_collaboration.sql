-- Projects V1.1: one capability-based collaboration foundation for Personal,
-- Team, and OHARA Guide Projects. Additive; existing owner data stays private.

alter table public.projects
  add column mode text not null default 'personal'
  check (mode in ('personal','team','guide'));

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','guide')),
  relationship_label text,
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id),
  check (relationship_label is null or char_length(relationship_label) <= 80),
  check (role = 'guide' or relationship_label is null)
);

create unique index project_members_one_owner_idx
  on public.project_members (project_id) where role = 'owner';
create index project_members_user_idx on public.project_members (user_id, project_id);

-- The launch cap is a database invariant, not only an RPC/UI check. The
-- transaction-scoped lock serializes direct inserts and invitation acceptance.
create or replace function public.enforce_project_member_limit_v11()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.project_id::text, 0));
  select count(*) into v_count from public.project_members where project_id = new.project_id;
  if v_count >= 3 then raise exception 'Project participant limit reached'; end if;
  return new;
end;
$$;

create trigger project_members_enforce_limit_v11
  before insert on public.project_members for each row execute function public.enforce_project_member_limit_v11();

insert into public.project_members (project_id, user_id, role)
select id, user_id, 'owner' from public.projects
on conflict (project_id, user_id) do nothing;

create or replace function public.ensure_project_owner_member_v11()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.user_id, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner', updated_at = now();
  return new;
end;
$$;

create trigger projects_ensure_owner_member_v11
  after insert on public.projects for each row execute function public.ensure_project_owner_member_v11();

create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid references public.profiles(id) on delete cascade,
  invited_email text,
  role text not null check (role in ('admin','member','guide')),
  relationship_label text,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((invited_user_id is not null)::integer + (invited_email is not null)::integer = 1),
  check (invited_email is null or char_length(btrim(invited_email)) between 3 and 320),
  check (relationship_label is null or char_length(relationship_label) <= 80),
  check (role = 'guide' or relationship_label is null)
);

create unique index project_invitations_pending_user_idx
  on public.project_invitations (project_id, invited_user_id)
  where status = 'pending' and invited_user_id is not null;
create unique index project_invitations_pending_email_idx
  on public.project_invitations (project_id, lower(invited_email))
  where status = 'pending' and invited_email is not null;
create index project_invitations_recipient_idx
  on public.project_invitations (invited_user_id, status, created_at desc);

create or replace function public.project_role_has_capability_v11(p_role text, p_capability text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select case p_role
    when 'owner' then p_capability = any(array[
      'view_project','manage_project','manage_members','invite_members','transfer_ownership',
      'create_goal','edit_goal','assign_goal_lead','create_task','assign_task','complete_task',
      'create_milestone','edit_milestone','assign_milestone','view_shared_vault',
      'add_shared_content','comment','view_shared_notes','view_shared_reflections'
    ])
    when 'admin' then p_capability = any(array[
      'view_project','manage_project','manage_members','invite_members',
      'assign_goal_lead','create_task','assign_task','complete_task','create_milestone',
      'edit_milestone','assign_milestone','view_shared_vault','add_shared_content','comment',
      'view_shared_notes','view_shared_reflections'
    ])
    when 'member' then p_capability = any(array[
      'view_project','create_task','complete_task','create_milestone','view_shared_vault',
      'add_shared_content','comment','view_shared_notes','view_shared_reflections'
    ])
    when 'guide' then p_capability = any(array[
      'view_project','assign_goal_lead','create_task','assign_task','complete_task',
      'create_milestone','edit_milestone','assign_milestone','view_shared_vault',
      'add_shared_content','comment','view_shared_notes','view_shared_reflections'
    ])
    else false
  end;
$$;

create or replace function public.project_has_capability_v11(
  p_project_id uuid, p_user_id uuid, p_capability text
)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.project_members pm
    join public.projects p on p.id = pm.project_id
    where pm.project_id = p_project_id and pm.user_id = p_user_id
      and p.status <> 'archived'
      and public.project_role_has_capability_v11(pm.role, p_capability)
  );
$$;

create or replace function public.is_project_member_v11(p_project_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (select 1 from public.project_members where project_id = p_project_id and user_id = p_user_id);
$$;

revoke all on function public.project_role_has_capability_v11(text,text) from public, anon;
revoke all on function public.project_has_capability_v11(uuid,uuid,text) from public, anon;
revoke all on function public.is_project_member_v11(uuid,uuid) from public, anon;
grant execute on function public.project_role_has_capability_v11(text,text) to authenticated;
grant execute on function public.project_has_capability_v11(uuid,uuid,text) to authenticated;
grant execute on function public.is_project_member_v11(uuid,uuid) to authenticated;

alter table public.project_members enable row level security;
alter table public.project_invitations enable row level security;

create policy "Project members can read membership" on public.project_members
  for select to authenticated using (public.is_project_member_v11(project_id, auth.uid()));
create policy "Recipients can read Project invitations" on public.project_invitations
  for select to authenticated using (
    invited_user_id = auth.uid() or inviter_id = auth.uid()
    or public.project_has_capability_v11(project_id, auth.uid(), 'manage_members')
  );

revoke insert, update, delete on public.project_members, public.project_invitations from authenticated, anon;
grant select on public.project_members, public.project_invitations to authenticated;
grant select, insert, update, delete on public.project_members, public.project_invitations to service_role;

drop policy if exists "Project collaborators can view projects" on public.projects;
create policy "Project collaborators can view projects" on public.projects
  for select to authenticated using (public.is_project_member_v11(id, auth.uid()));

create or replace function public.create_project_invitation_v11(
  p_project_id uuid, p_invited_user_id uuid, p_invited_email text,
  p_role text, p_relationship_label text default null
)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid; v_total integer; v_mode text;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not public.project_has_capability_v11(p_project_id, auth.uid(), 'invite_members') then
    raise exception 'Project invitation not permitted';
  end if;
  if p_role not in ('admin','member','guide') then raise exception 'Invalid Project role'; end if;
  if (p_invited_user_id is null) = (nullif(btrim(p_invited_email), '') is null) then
    raise exception 'Choose one invitation recipient';
  end if;
  select mode into v_mode from public.projects where id = p_project_id;
  if v_mode = 'personal' then raise exception 'Personal Projects cannot invite members'; end if;
  if v_mode = 'guide' and p_role <> 'guide' then raise exception 'Guide Projects require a Guide role'; end if;
  if v_mode = 'team' and p_role = 'guide' then raise exception 'Team Projects do not use Guide roles'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));
  if p_invited_user_id is not null and public.is_project_member_v11(p_project_id, p_invited_user_id) then
    raise exception 'Already a Project member';
  end if;
  select (select count(*) from public.project_members where project_id = p_project_id)
       + (select count(*) from public.project_invitations where project_id = p_project_id and status = 'pending' and expires_at > now())
  into v_total;
  if v_total >= 3 then raise exception 'Project participant limit reached'; end if;
  insert into public.project_invitations (
    project_id, inviter_id, invited_user_id, invited_email, role, relationship_label
  ) values (
    p_project_id, auth.uid(), p_invited_user_id, nullif(lower(btrim(p_invited_email)), ''),
    p_role, case when p_role = 'guide' then nullif(btrim(p_relationship_label), '') else null end
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.respond_project_invitation_v11(p_invitation_id uuid, p_response text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_inv public.project_invitations; v_count integer; v_mode text; v_project_status text;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_response not in ('accepted','declined') then raise exception 'Invalid invitation response'; end if;
  select * into v_inv from public.project_invitations where id = p_invitation_id for update;
  if v_inv.id is null or v_inv.invited_user_id <> auth.uid() or v_inv.status <> 'pending' then
    raise exception 'Invitation not found';
  end if;
  if v_inv.expires_at <= now() then
    update public.project_invitations set status='expired', responded_at=now(), updated_at=now() where id=v_inv.id;
    raise exception 'Invitation expired';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_inv.project_id::text, 0));
  if p_response = 'accepted' then
    select mode,status into v_mode,v_project_status from public.projects where id=v_inv.project_id;
    if v_project_status='archived' then raise exception 'Archived Projects cannot accept invitations'; end if;
    if (v_mode='guide' and v_inv.role<>'guide') or (v_mode='team' and v_inv.role='guide') or v_mode='personal' then
      raise exception 'Invitation is no longer compatible with this Project mode';
    end if;
    select count(*) into v_count from public.project_members where project_id = v_inv.project_id;
    if v_count >= 3 then raise exception 'Project participant limit reached'; end if;
    insert into public.project_members (project_id,user_id,role,relationship_label,invited_by)
    values (v_inv.project_id,auth.uid(),v_inv.role,v_inv.relationship_label,v_inv.inviter_id);
  end if;
  update public.project_invitations set status=p_response, responded_at=now(), updated_at=now() where id=v_inv.id;
  return v_inv.project_id;
end;
$$;

create or replace function public.revoke_project_invitation_v11(p_invitation_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid;
begin
  select project_id into v_project from public.project_invitations where id=p_invitation_id and status='pending';
  if v_project is null or not public.project_has_capability_v11(v_project, auth.uid(), 'invite_members') then
    raise exception 'Invitation not found';
  end if;
  update public.project_invitations set status='revoked', responded_at=now(), updated_at=now() where id=p_invitation_id;
  return found;
end;
$$;

create or replace function public.set_project_mode_v11(p_project_id uuid, p_mode text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if p_mode not in ('personal','team','guide') then raise exception 'Invalid Project mode'; end if;
  if not exists (select 1 from public.projects where id=p_project_id and user_id=auth.uid()) then
    raise exception 'Project not found';
  end if;
  if p_mode = 'personal' and (
    exists (select 1 from public.project_members where project_id=p_project_id and user_id<>auth.uid())
    or exists (select 1 from public.project_invitations where project_id=p_project_id and status='pending')
  ) then raise exception 'Remove members and pending invitations before switching to Personal'; end if;
  if p_mode = 'team' and exists (select 1 from public.project_members where project_id=p_project_id and role='guide') then
    raise exception 'Resolve Guide membership before switching to Team';
  end if;
  if p_mode = 'guide' and exists (select 1 from public.project_members where project_id=p_project_id and role not in ('owner','guide')) then
    raise exception 'Resolve Team membership before switching to Guide';
  end if;
  if exists (
    select 1 from public.project_invitations where project_id=p_project_id and status='pending'
      and ((p_mode='team' and role='guide') or (p_mode='guide' and role<>'guide'))
  ) then raise exception 'Resolve pending invitations before changing this Project mode'; end if;
  update public.projects set mode=p_mode where id=p_project_id;
  return found;
end;
$$;

create or replace function public.update_project_details_v11(p_project_id uuid,p_title text,p_description text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.project_has_capability_v11(p_project_id,auth.uid(),'manage_project') then raise exception 'Not permitted'; end if;
  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title))>200 then raise exception 'Project name must contain 1 to 200 characters'; end if;
  if p_description is not null and char_length(p_description)>4000 then raise exception 'Project description is too long'; end if;
  update public.projects set title=btrim(p_title),description=nullif(btrim(p_description),'') where id=p_project_id;
  return found;
end;
$$;

create or replace function public.set_project_member_role_v11(p_project_id uuid,p_user_id uuid,p_role text,p_label text default null)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_mode text;
begin
  if not public.project_has_capability_v11(p_project_id,auth.uid(),'manage_members') then raise exception 'Not permitted'; end if;
  if p_role not in ('admin','member','guide') then raise exception 'Invalid Project role'; end if;
  select mode into v_mode from public.projects where id=p_project_id;
  if (v_mode='guide' and p_role<>'guide') or (v_mode='team' and p_role='guide') or v_mode='personal' then
    raise exception 'Role is not compatible with this Project mode';
  end if;
  if exists (select 1 from public.project_members where project_id=p_project_id and user_id=p_user_id and role='owner') then raise exception 'Owner role cannot be changed'; end if;
  update public.project_members set role=p_role,relationship_label=case when p_role='guide' then nullif(btrim(p_label),'') else null end,updated_at=now()
  where project_id=p_project_id and user_id=p_user_id;
  return found;
end;
$$;

create or replace function public.remove_project_member_v11(p_project_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.project_has_capability_v11(p_project_id,auth.uid(),'manage_members') then raise exception 'Not permitted'; end if;
  if exists (select 1 from public.project_members where project_id=p_project_id and user_id=p_user_id and role='owner') then raise exception 'Owner cannot be removed'; end if;
  update public.goals set project_lead_id=null where project_id=p_project_id and project_lead_id=p_user_id;
  update public.tasks t set assigned_to=null where assigned_to=p_user_id and exists(select 1 from public.goals g where g.id=t.goal_id and g.project_id=p_project_id);
  update public.milestones m set responsible_user_id=null where responsible_user_id=p_user_id and exists(select 1 from public.goals g where g.id=m.goal_id and g.project_id=p_project_id);
  delete from public.project_members where project_id=p_project_id and user_id=p_user_id;
  return found;
end;
$$;

revoke all on function public.create_project_invitation_v11(uuid,uuid,text,text,text) from public,anon;
revoke all on function public.respond_project_invitation_v11(uuid,text) from public,anon;
revoke all on function public.revoke_project_invitation_v11(uuid) from public,anon;
revoke all on function public.set_project_mode_v11(uuid,text) from public,anon;
revoke all on function public.update_project_details_v11(uuid,text,text) from public,anon;
revoke all on function public.set_project_member_role_v11(uuid,uuid,text,text) from public,anon;
revoke all on function public.remove_project_member_v11(uuid,uuid) from public,anon;
grant execute on function public.create_project_invitation_v11(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.respond_project_invitation_v11(uuid,text) to authenticated;
grant execute on function public.revoke_project_invitation_v11(uuid) to authenticated;
grant execute on function public.set_project_mode_v11(uuid,text) to authenticated;
grant execute on function public.update_project_details_v11(uuid,text,text) to authenticated;
grant execute on function public.set_project_member_role_v11(uuid,uuid,text,text) to authenticated;
grant execute on function public.remove_project_member_v11(uuid,uuid) to authenticated;

-- Responsibility extends canonical objects; ownership remains unchanged.
alter table public.goals add column project_lead_id uuid references public.profiles(id) on delete set null;
alter table public.tasks
  add column assigned_to uuid references public.profiles(id) on delete set null,
  add column assigned_by uuid references public.profiles(id) on delete set null,
  add column created_by uuid references public.profiles(id) on delete set null;
alter table public.milestones
  add column responsible_user_id uuid references public.profiles(id) on delete set null,
  add column assigned_by uuid references public.profiles(id) on delete set null,
  add column created_by uuid references public.profiles(id) on delete set null;
alter table public.task_occurrences add column completed_by uuid references public.profiles(id) on delete set null;

create or replace function public.validate_project_responsibility_v11()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid; v_user uuid;
begin
  if tg_table_name = 'goals' then v_project:=new.project_id; v_user:=new.project_lead_id;
  elsif tg_table_name = 'tasks' then select project_id into v_project from public.goals where id=new.goal_id; v_user:=new.assigned_to;
  else select project_id into v_project from public.goals where id=new.goal_id; v_user:=new.responsible_user_id;
  end if;
  if v_user is not null and (v_project is null or not public.is_project_member_v11(v_project,v_user)) then
    raise exception 'Responsibility must belong to a current Project member';
  end if;
  return new;
end;
$$;

create trigger goals_validate_project_lead_v11 before insert or update of project_id,project_lead_id on public.goals
  for each row execute function public.validate_project_responsibility_v11();
create trigger tasks_validate_assignee_v11 before insert or update of goal_id,assigned_to on public.tasks
  for each row execute function public.validate_project_responsibility_v11();
create trigger milestones_validate_responsibility_v11 before insert or update of goal_id,responsible_user_id on public.milestones
  for each row execute function public.validate_project_responsibility_v11();

create or replace function public.assign_project_goal_lead_v11(p_goal_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid;
begin
  select project_id into v_project from public.goals where id=p_goal_id;
  if v_project is null or not public.project_has_capability_v11(v_project,auth.uid(),'assign_goal_lead') then raise exception 'Not permitted'; end if;
  if p_user_id is not null and not public.is_project_member_v11(v_project,p_user_id) then raise exception 'Invalid Goal Lead'; end if;
  update public.goals set project_lead_id=p_user_id where id=p_goal_id;
  return found;
end;
$$;

create or replace function public.assign_project_task_v11(p_task_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid;
begin
  select g.project_id into v_project from public.tasks t join public.goals g on g.id=t.goal_id where t.id=p_task_id;
  if v_project is null or not public.project_has_capability_v11(v_project,auth.uid(),'assign_task') then raise exception 'Not permitted'; end if;
  if p_user_id is not null and not public.is_project_member_v11(v_project,p_user_id) then raise exception 'Invalid Task assignee'; end if;
  update public.tasks set assigned_to=p_user_id,assigned_by=auth.uid() where id=p_task_id;
  return found;
end;
$$;

create or replace function public.assign_project_milestone_v11(p_milestone_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid;
begin
  select g.project_id into v_project from public.milestones m join public.goals g on g.id=m.goal_id where m.id=p_milestone_id;
  if v_project is null or not public.project_has_capability_v11(v_project,auth.uid(),'assign_milestone') then raise exception 'Not permitted'; end if;
  if p_user_id is not null and not public.is_project_member_v11(v_project,p_user_id) then raise exception 'Invalid Milestone assignee'; end if;
  update public.milestones set responsible_user_id=p_user_id,assigned_by=auth.uid() where id=p_milestone_id;
  return found;
end;
$$;

revoke all on function public.assign_project_goal_lead_v11(uuid,uuid) from public,anon;
revoke all on function public.assign_project_task_v11(uuid,uuid) from public,anon;
revoke all on function public.assign_project_milestone_v11(uuid,uuid) from public,anon;
grant execute on function public.assign_project_goal_lead_v11(uuid,uuid) to authenticated;
grant execute on function public.assign_project_task_v11(uuid,uuid) to authenticated;
grant execute on function public.assign_project_milestone_v11(uuid,uuid) to authenticated;

-- Explicit content sharing. Private remains the default and is never inferred.
alter table public.entries add column project_share_scope text not null default 'private'
  check (project_share_scope in ('private','project','guide'));

drop policy if exists "Project members can read shared entries" on public.entries;
create policy "Project members can read shared entries" on public.entries for select to authenticated using (
  project_id is not null and project_share_scope <> 'private'
  and public.is_project_member_v11(project_id,auth.uid())
  and (project_share_scope='project' or exists (
    select 1 from public.project_members pm where pm.project_id=entries.project_id and pm.user_id=auth.uid() and pm.role in ('owner','guide')
  ))
);

create policy "Project members can read shared Entry Goal links" on public.entry_goal_links for select to authenticated using (
  exists (
    select 1 from public.entries e
    where e.id=entry_goal_links.entry_id and e.project_id is not null
      and e.project_share_scope<>'private'
      and public.is_project_member_v11(e.project_id,auth.uid())
      and (e.project_share_scope='project' or exists (
        select 1 from public.project_members pm
        where pm.project_id=e.project_id and pm.user_id=auth.uid() and pm.role in ('owner','guide')
      ))
  )
);

create or replace function public.set_entry_project_share_v11(p_entry_id uuid,p_scope text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid;
begin
  if p_scope not in ('private','project','guide') then raise exception 'Invalid sharing scope'; end if;
  select project_id into v_project from public.entries where id=p_entry_id and user_id=auth.uid();
  if v_project is null and p_scope<>'private' then raise exception 'Entry must belong to a Project before it can be shared'; end if;
  if p_scope<>'private' and not public.project_has_capability_v11(v_project,auth.uid(),'add_shared_content') then raise exception 'Not permitted'; end if;
  update public.entries set project_share_scope=p_scope where id=p_entry_id and user_id=auth.uid();
  return found;
end;
$$;
revoke all on function public.set_entry_project_share_v11(uuid,text) from public,anon;
grant execute on function public.set_entry_project_share_v11(uuid,text) to authenticated;

-- Project-scoped contextual comments, not chat.
create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('goal','task','milestone','entry','source')),
  target_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index project_comments_target_idx on public.project_comments(project_id,target_type,target_id,created_at);
alter table public.project_comments enable row level security;
create policy "Project members can read comments" on public.project_comments for select to authenticated using (
  deleted_at is null and public.is_project_member_v11(project_id,auth.uid())
);
revoke insert,update,delete on public.project_comments from authenticated,anon;
grant select on public.project_comments to authenticated;
grant select,insert,update,delete on public.project_comments to service_role;

create table public.project_activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  target_type text,
  target_id uuid,
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index project_activity_events_project_time_idx on public.project_activity_events(project_id,occurred_at desc);
alter table public.project_activity_events enable row level security;
create policy "Project members can read activity" on public.project_activity_events for select to authenticated using (
  public.is_project_member_v11(project_id,auth.uid())
);
revoke insert,update,delete on public.project_activity_events from authenticated,anon;
grant select on public.project_activity_events to authenticated;
grant select,insert,update,delete on public.project_activity_events to service_role;

create or replace function public.validate_project_comment_target_v11(p_project uuid,p_type text,p_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select case p_type
    when 'goal' then exists(select 1 from public.goals where id=p_id and project_id=p_project)
    when 'task' then exists(select 1 from public.tasks t join public.goals g on g.id=t.goal_id where t.id=p_id and g.project_id=p_project)
    when 'milestone' then exists(select 1 from public.milestones m join public.goals g on g.id=m.goal_id where m.id=p_id and g.project_id=p_project)
    when 'entry' then exists(select 1 from public.entries where id=p_id and project_id=p_project and project_share_scope<>'private')
    when 'source' then exists(select 1 from public.vault_items vi join public.vaults v on v.id=vi.vault_id where vi.id=p_id and v.project_id=p_project and vi.visibility='vault_members')
    else false end;
$$;

create or replace function public.create_project_comment_v11(p_project uuid,p_type text,p_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  if not public.project_has_capability_v11(p_project,auth.uid(),'comment') then raise exception 'Not permitted'; end if;
  if not public.validate_project_comment_target_v11(p_project,p_type,p_id) then raise exception 'Comment target not found'; end if;
  insert into public.project_comments(project_id,author_id,target_type,target_id,body)
  values(p_project,auth.uid(),p_type,p_id,btrim(p_body)) returning id into v_id;
  insert into public.project_activity_events(project_id,actor_id,event_type,target_type,target_id,label)
  values(p_project,auth.uid(),'comment.created',p_type,p_id,'Commented on '||initcap(p_type));
  return v_id;
end;
$$;

create or replace function public.edit_project_comment_v11(p_comment uuid,p_body text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if char_length(btrim(coalesce(p_body,''))) not between 1 and 2000 then
    raise exception 'Comment must be between 1 and 2000 characters';
  end if;
  update public.project_comments c
    set body=btrim(p_body),edited_at=now()
    where c.id=p_comment and c.author_id=auth.uid() and c.deleted_at is null
      and public.project_has_capability_v11(c.project_id,auth.uid(),'comment');
  return found;
end;
$$;

create or replace function public.delete_project_comment_v11(p_comment uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  update public.project_comments c set deleted_at=now() where c.id=p_comment and c.author_id=auth.uid() and c.deleted_at is null
    and public.project_has_capability_v11(c.project_id,auth.uid(),'comment');
  return found;
end;
$$;

revoke all on function public.validate_project_comment_target_v11(uuid,text,uuid) from public,anon;
revoke all on function public.create_project_comment_v11(uuid,text,uuid,text) from public,anon;
revoke all on function public.edit_project_comment_v11(uuid,text) from public,anon;
revoke all on function public.delete_project_comment_v11(uuid) from public,anon;
grant execute on function public.validate_project_comment_target_v11(uuid,text,uuid) to authenticated;
grant execute on function public.create_project_comment_v11(uuid,text,uuid,text) to authenticated;
grant execute on function public.edit_project_comment_v11(uuid,text) to authenticated;
grant execute on function public.delete_project_comment_v11(uuid) to authenticated;

-- Collaborators can read only Project-scoped canonical objects and explicitly
-- shared content. Owner policies remain unchanged.
create policy "Project members can read Goals" on public.goals for select to authenticated using (
  project_id is not null and public.is_project_member_v11(project_id,auth.uid())
);
create policy "Project members can read Tasks" on public.tasks for select to authenticated using (
  exists(select 1 from public.goals g where g.id=tasks.goal_id and g.project_id is not null and public.is_project_member_v11(g.project_id,auth.uid()))
);
create policy "Project members can read Task schedules" on public.task_schedules for select to authenticated using (
  exists(select 1 from public.tasks t join public.goals g on g.id=t.goal_id where t.id=task_schedules.task_id and g.project_id is not null and public.is_project_member_v11(g.project_id,auth.uid()))
);
create policy "Project members can read Task occurrences" on public.task_occurrences for select to authenticated using (
  exists(select 1 from public.tasks t join public.goals g on g.id=t.goal_id where t.id=task_occurrences.task_id and g.project_id is not null and public.is_project_member_v11(g.project_id,auth.uid()))
);
create policy "Project members can read Milestones" on public.milestones for select to authenticated using (
  exists(select 1 from public.goals g where g.id=milestones.goal_id and g.project_id is not null and public.is_project_member_v11(g.project_id,auth.uid()))
);
create policy "Project members can read Project Vaults" on public.vaults for select to authenticated using (
  (project_id is not null and public.is_project_member_v11(project_id,auth.uid()))
  or (goal_id is not null and exists(select 1 from public.goals g where g.id=vaults.goal_id and g.project_id is not null and public.is_project_member_v11(g.project_id,auth.uid())))
);
create policy "Project members can read shared Vault items" on public.vault_items for select to authenticated using (
  visibility='vault_members' and exists(
    select 1 from public.vaults v left join public.goals g on g.id=v.goal_id
    where v.id=vault_items.vault_id and public.is_project_member_v11(coalesce(v.project_id,g.project_id),auth.uid())
  )
);

create policy "Project members can add shared Vault items" on public.vault_items for insert to authenticated with check (
  created_by=auth.uid() and visibility='vault_members' and exists(
    select 1 from public.vaults v
    where v.id=vault_items.vault_id and v.project_id is not null
      and public.project_has_capability_v11(v.project_id,auth.uid(),'add_shared_content')
  )
);
drop policy if exists "Item creators can update" on public.vault_items;
create policy "Authorized creators can update Vault items" on public.vault_items for update to authenticated using (
  created_by=auth.uid() and exists(
    select 1 from public.vaults v left join public.goals g on g.id=v.goal_id
    where v.id=vault_items.vault_id and (
      v.user_id=auth.uid() or public.project_has_capability_v11(coalesce(v.project_id,g.project_id),auth.uid(),'add_shared_content')
    )
  )
) with check (created_by=auth.uid());
drop policy if exists "Item creators can delete" on public.vault_items;
create policy "Authorized creators can delete Vault items" on public.vault_items for delete to authenticated using (
  created_by=auth.uid() and exists(
    select 1 from public.vaults v left join public.goals g on g.id=v.goal_id
    where v.id=vault_items.vault_id and (
      v.user_id=auth.uid() or public.project_has_capability_v11(coalesce(v.project_id,g.project_id),auth.uid(),'add_shared_content')
    )
  )
);

drop policy if exists "Project members can read Goal events" on public.project_goal_events;
create policy "Project members can read Goal events" on public.project_goal_events for select to authenticated using (
  (project_id is not null and public.is_project_member_v11(project_id,auth.uid()))
  or (prior_project_id is not null and public.is_project_member_v11(prior_project_id,auth.uid()))
);

create or replace function public.get_project_collaboration_v11(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare v_role text; v_status text; v_result jsonb;
begin
  select pm.role,p.status into v_role,v_status from public.project_members pm join public.projects p on p.id=pm.project_id where pm.project_id=p_project_id and pm.user_id=auth.uid();
  if v_role is null then raise exception 'Project not found'; end if;
  select jsonb_build_object(
    'role',v_role,
    'capabilities',(select coalesce(jsonb_agg(capability), '[]'::jsonb) from unnest(array[
      'view_project','manage_project','manage_members','invite_members','transfer_ownership',
      'create_goal','edit_goal','assign_goal_lead','create_task','assign_task','complete_task',
      'create_milestone','edit_milestone','assign_milestone','view_shared_vault',
      'add_shared_content','comment','view_shared_notes','view_shared_reflections'
    ]) capability where public.project_role_has_capability_v11(v_role,capability) and (v_status<>'archived' or capability='view_project')),
    'members',(select coalesce(jsonb_agg(jsonb_build_object(
      'userId',pm.user_id,'role',pm.role,'relationshipLabel',pm.relationship_label,
      'displayName',coalesce(nullif(p.display_name,''),p.username::text),'username',p.username::text,
      'avatarUrl',p.avatar_url,'joinedAt',pm.joined_at
    ) order by case pm.role when 'owner' then 0 when 'admin' then 1 when 'guide' then 2 else 3 end,pm.joined_at),'[]'::jsonb)
      from public.project_members pm join public.profiles p on p.id=pm.user_id where pm.project_id=p_project_id),
    'invitations',(case when public.project_role_has_capability_v11(v_role,'manage_members') then
      (select coalesce(jsonb_agg(jsonb_build_object(
        'id',i.id,'invitedUserId',i.invited_user_id,'invitedEmail',i.invited_email,
        'role',i.role,'relationshipLabel',i.relationship_label,'status',i.status,
        'expiresAt',i.expires_at,'createdAt',i.created_at
      ) order by i.created_at desc),'[]'::jsonb) from public.project_invitations i where i.project_id=p_project_id)
      else '[]'::jsonb end)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.get_my_project_invitations_v11()
returns table (
  id uuid, project_id uuid, project_title text, inviter_name text, role text,
  relationship_label text, expires_at timestamptz, created_at timestamptz
) language sql stable security definer set search_path = pg_catalog, public as $$
  select i.id,i.project_id,p.title,
    coalesce(nullif(inviter.display_name,''),inviter.username::text),
    i.role,i.relationship_label,i.expires_at,i.created_at
  from public.project_invitations i
  join public.projects p on p.id=i.project_id
  join public.profiles inviter on inviter.id=i.inviter_id
  where i.invited_user_id=auth.uid() and i.status='pending' and i.expires_at>now() and p.status<>'archived'
  order by i.created_at desc;
$$;

-- Read-only Goal Momentum projection for authorized Project members. This does
-- not calculate or store a Project score and does not change Momentum V1.1.
create or replace function public.get_project_goal_momentum_v11(p_project_id uuid)
returns table(goal_id uuid,current_value numeric,weekly_change numeric,status text)
language sql stable security definer set search_path = pg_catalog, public as $$
  select g.id,mp.current_value,
    case when latest.previous_value is null then 0 else latest.current_value-latest.previous_value end,
    mp.status
  from public.goals g
  left join public.goal_momentum_profiles mp on mp.goal_id=g.id and mp.user_id=g.user_id
  left join lateral (
    select s.current_value,s.previous_value from public.goal_momentum_weekly_snapshots s
    where s.goal_id=g.id and s.user_id=g.user_id order by s.week_start desc,s.revision desc limit 1
  ) latest on true
  where g.project_id=p_project_id and public.is_project_member_v11(p_project_id,auth.uid());
$$;

create or replace function public.create_project_v11(
  p_title text,p_description text default null,p_mode text default 'personal',
  p_goal_ids uuid[] default '{}'::uuid[],p_allow_reassignment boolean default false
)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_mode not in ('personal','team','guide') then raise exception 'Invalid Project mode'; end if;
  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title))>200 then raise exception 'Project name must contain 1 to 200 characters'; end if;
  if p_description is not null and char_length(p_description)>4000 then raise exception 'Project description is too long'; end if;
  insert into public.projects(user_id,title,description,mode)
  values(auth.uid(),btrim(p_title),nullif(btrim(p_description),''),p_mode) returning id into v_id;
  perform public.assign_goals_to_project_v1(v_id,coalesce(p_goal_ids,'{}'::uuid[]),p_allow_reassignment);
  return v_id;
end;
$$;

create or replace function public.create_project_task_v11(
  p_goal_id uuid,p_title text,p_due_date date default null,p_assigned_to uuid default null,p_idempotency_key text default null
)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid; v_owner uuid; v_task uuid; v_timezone text;
begin
  select project_id,user_id into v_project,v_owner from public.goals where id=p_goal_id and status='active';
  if v_project is null or not public.project_has_capability_v11(v_project,auth.uid(),'create_task') then raise exception 'Active Project Goal not found'; end if;
  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title))>500 then raise exception 'Invalid Task title'; end if;
  if p_assigned_to is not null and not public.is_project_member_v11(v_project,p_assigned_to) then raise exception 'Invalid Task assignee'; end if;
  select timezone into v_timezone from public.profiles where id=v_owner;
  insert into public.tasks(user_id,goal_id,title,completion_mode,status,due_date,source,create_idempotency_key,assigned_to,assigned_by,created_by)
  values(v_owner,p_goal_id,btrim(p_title),'binary','active',p_due_date,'user',nullif(btrim(p_idempotency_key),''),p_assigned_to,auth.uid(),auth.uid())
  on conflict(user_id,create_idempotency_key) where create_idempotency_key is not null do update set updated_at=public.tasks.updated_at
  returning id into v_task;
  insert into public.task_occurrences(user_id,task_id,occurrence_key,scheduled_local_date,schedule_timezone,status,source,idempotency_key)
  values(v_owner,v_task,'one-time:'||v_task::text,p_due_date,coalesce(nullif(v_timezone,''),'UTC'),'pending','user',case when p_idempotency_key is null then null else p_idempotency_key||':occurrence' end)
  on conflict(task_id,occurrence_key) do nothing;
  insert into public.project_activity_events(project_id,actor_id,event_type,target_type,target_id,label,metadata)
  values(v_project,auth.uid(),'task.created','task',v_task,'Added Task',jsonb_build_object('title',btrim(p_title),'assignedTo',p_assigned_to));
  return v_task;
end;
$$;

create or replace function public.create_project_milestone_v11(
  p_goal_id uuid,p_title text,p_due_date date default null,p_responsible_user_id uuid default null
)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid; v_owner uuid; v_id uuid;
begin
  select project_id,user_id into v_project,v_owner from public.goals where id=p_goal_id and status='active';
  if v_project is null or not public.project_has_capability_v11(v_project,auth.uid(),'create_milestone') then raise exception 'Active Project Goal not found'; end if;
  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title))>500 then raise exception 'Invalid Milestone title'; end if;
  if p_responsible_user_id is not null and not public.is_project_member_v11(v_project,p_responsible_user_id) then raise exception 'Invalid Milestone responsibility'; end if;
  insert into public.milestones(goal_id,user_id,title,due_date,sort_order,is_ai_suggested,responsible_user_id,assigned_by,created_by)
  values(p_goal_id,v_owner,btrim(p_title),p_due_date,0,false,p_responsible_user_id,auth.uid(),auth.uid()) returning id into v_id;
  insert into public.project_activity_events(project_id,actor_id,event_type,target_type,target_id,label,metadata)
  values(v_project,auth.uid(),'milestone.created','milestone',v_id,'Added Milestone',jsonb_build_object('title',btrim(p_title),'responsibleUserId',p_responsible_user_id));
  return v_id;
end;
$$;

create or replace function public.complete_project_task_v11(p_occurrence_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid; v_task uuid; v_assignee uuid; v_title text;
begin
  select g.project_id,t.id,t.assigned_to,t.title into v_project,v_task,v_assignee,v_title
  from public.task_occurrences o join public.tasks t on t.id=o.task_id join public.goals g on g.id=t.goal_id
  where o.id=p_occurrence_id and o.status='pending';
  if v_project is null or not public.project_has_capability_v11(v_project,auth.uid(),'complete_task') then raise exception 'Task not found'; end if;
  if v_assignee is not null and v_assignee<>auth.uid() and not public.project_has_capability_v11(v_project,auth.uid(),'assign_task') then raise exception 'Task is assigned to another member'; end if;
  update public.task_occurrences set status='completed',completed_at=now(),completed_by=auth.uid(),updated_at=now() where id=p_occurrence_id and status='pending';
  if found then insert into public.project_activity_events(project_id,actor_id,event_type,target_type,target_id,label,metadata)
    values(v_project,auth.uid(),'task.completed','task',v_task,'Completed Task',jsonb_build_object('title',v_title)); end if;
  return found;
end;
$$;

-- Make assignment activity actor-aware from this point forward.
create or replace function public.assign_project_task_v11(p_task_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid; v_title text;
begin
  select g.project_id,t.title into v_project,v_title from public.tasks t join public.goals g on g.id=t.goal_id where t.id=p_task_id;
  if v_project is null or not public.project_has_capability_v11(v_project,auth.uid(),'assign_task') then raise exception 'Not permitted'; end if;
  if p_user_id is not null and not public.is_project_member_v11(v_project,p_user_id) then raise exception 'Invalid Task assignee'; end if;
  update public.tasks set assigned_to=p_user_id,assigned_by=auth.uid() where id=p_task_id;
  if found then insert into public.project_activity_events(project_id,actor_id,event_type,target_type,target_id,label,metadata)
    values(v_project,auth.uid(),'task.assigned','task',p_task_id,'Assigned Task',jsonb_build_object('title',v_title,'assignedTo',p_user_id)); end if;
  return found;
end;
$$;

create or replace function public.assign_project_goal_lead_v11(p_goal_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid; v_title text;
begin
  select project_id,title into v_project,v_title from public.goals where id=p_goal_id;
  if v_project is null or not public.project_has_capability_v11(v_project,auth.uid(),'assign_goal_lead') then raise exception 'Not permitted'; end if;
  if p_user_id is not null and not public.is_project_member_v11(v_project,p_user_id) then raise exception 'Invalid Goal Lead'; end if;
  update public.goals set project_lead_id=p_user_id where id=p_goal_id;
  if found then insert into public.project_activity_events(project_id,actor_id,event_type,target_type,target_id,label,metadata)
    values(v_project,auth.uid(),'goal.lead_assigned','goal',p_goal_id,'Changed Goal Lead',jsonb_build_object('title',v_title,'leadUserId',p_user_id)); end if;
  return found;
end;
$$;

create or replace function public.assign_project_milestone_v11(p_milestone_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project uuid; v_title text;
begin
  select g.project_id,m.title into v_project,v_title from public.milestones m join public.goals g on g.id=m.goal_id where m.id=p_milestone_id;
  if v_project is null or not public.project_has_capability_v11(v_project,auth.uid(),'assign_milestone') then raise exception 'Not permitted'; end if;
  if p_user_id is not null and not public.is_project_member_v11(v_project,p_user_id) then raise exception 'Invalid Milestone assignee'; end if;
  update public.milestones set responsible_user_id=p_user_id,assigned_by=auth.uid() where id=p_milestone_id;
  if found then insert into public.project_activity_events(project_id,actor_id,event_type,target_type,target_id,label,metadata)
    values(v_project,auth.uid(),'milestone.assigned','milestone',p_milestone_id,'Assigned Milestone',jsonb_build_object('title',v_title,'responsibleUserId',p_user_id)); end if;
  return found;
end;
$$;

revoke all on function public.get_project_collaboration_v11(uuid) from public,anon;
revoke all on function public.get_my_project_invitations_v11() from public,anon;
revoke all on function public.get_project_goal_momentum_v11(uuid) from public,anon;
revoke all on function public.create_project_v11(text,text,text,uuid[],boolean) from public,anon;
revoke all on function public.create_project_task_v11(uuid,text,date,uuid,text) from public,anon;
revoke all on function public.create_project_milestone_v11(uuid,text,date,uuid) from public,anon;
revoke all on function public.complete_project_task_v11(uuid) from public,anon;
grant execute on function public.get_project_collaboration_v11(uuid) to authenticated;
grant execute on function public.get_my_project_invitations_v11() to authenticated;
grant execute on function public.get_project_goal_momentum_v11(uuid) to authenticated;
grant execute on function public.create_project_v11(text,text,text,uuid[],boolean) to authenticated;
grant execute on function public.create_project_task_v11(uuid,text,date,uuid,text) to authenticated;
grant execute on function public.create_project_milestone_v11(uuid,text,date,uuid) to authenticated;
grant execute on function public.complete_project_task_v11(uuid) to authenticated;

comment on column public.tasks.assigned_to is 'Project responsibility only; canonical Task ownership remains its Goal owner.';
comment on column public.milestones.responsible_user_id is 'Project responsibility only; canonical Milestone ownership remains its Goal owner.';

comment on table public.project_members is 'Projects V1.1 canonical membership. Maximum three members including the owner.';
comment on table public.project_invitations is 'Pending membership offers; acceptance is serialized against the participant cap.';
comment on column public.entries.project_share_scope is 'Explicit Project sharing only. Membership never implies access to private Entries.';
