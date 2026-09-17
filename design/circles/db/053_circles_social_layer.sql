-- ============================================================================
-- 053_circles_social_layer.sql  — DRAFT (not yet in supabase/migrations/)
--
-- Circles: the friends-only social layer behind Home.
-- Design + rationale: design/circles/PLAN.md, design/circles/DECISIONS.md.
--
-- Privacy model enforced here:
--   1. Goals, notes and reflections stay private by default (goals.visibility
--      default 'private' is unchanged).
--   2. A user may mark at most ONE Goal visibility = 'public'; every accepted
--      friend may view it (view only).
--   3. Any other Goal is viewable only by a friend who was explicitly invited
--      AND accepted (goal_share_invites.status = 'accepted').
--   4. Friends NEVER read public.goals / milestones / tasks rows directly.
--      Row-level policies cannot hide columns, so viewing happens only through
--      SECURITY DEFINER functions that return a whitelisted summary:
--      title, category, status, top-level milestone titles + done, and this
--      week's Task count. Never description, reflection, smart_data, Entries,
--      Vault, or Task titles.
--   5. Feed posts link a Goal / milestone / reflection by a SNAPSHOT of its
--      title plus an author-written short description, validated for
--      ownership at post time. The feed never joins into private tables.
--   6. Encouragement counts are public to anyone who can see the post.
--   7. Saved posts are private to the saver.
--
-- Mutations that cross users (invites, posts) go through RPCs, mirroring the
-- Migration 030 friend-connection lock-down. Direct table grants are limited to
-- what each RLS policy explicitly allows (Migration 039 convention).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1 — Friendship helper
-- ----------------------------------------------------------------------------

create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p_a is not null
    and p_b is not null
    and p_a <> p_b
    and exists (
      select 1
      from public.friend_connections fc
      where fc.status = 'accepted'
        and least(fc.requester_id, fc.addressee_id) = least(p_a, p_b)
        and greatest(fc.requester_id, fc.addressee_id) = greatest(p_a, p_b)
    );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
revoke all on function public.are_friends(uuid, uuid) from anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Part 2 — One public Goal per user
-- ----------------------------------------------------------------------------

-- 'circle' (legacy, one live row at draft time) is treated as private by every
-- function below; only 'public' is ever exposed.
create unique index goals_one_public_per_user
  on public.goals (user_id)
  where visibility = 'public';

-- Atomically swap the caller's public Goal (or clear it with NULL).
create or replace function public.set_public_goal(p_goal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'unauthorized';
  end if;

  if p_goal_id is not null and not exists (
    select 1 from public.goals g
    where g.id = p_goal_id
      and g.user_id = v_user_id
      and g.status in ('active', 'complete', 'stagnant')
  ) then
    raise exception using errcode = 'P0002', message = 'goal_not_found_or_not_shareable';
  end if;

  update public.goals
    set visibility = 'private', updated_at = now()
  where user_id = v_user_id
    and visibility = 'public'
    and id is distinct from p_goal_id;

  if p_goal_id is not null then
    update public.goals
      set visibility = 'public', updated_at = now()
    where id = p_goal_id and user_id = v_user_id;
  end if;

  return p_goal_id;
end;
$$;

revoke all on function public.set_public_goal(uuid) from public;
revoke all on function public.set_public_goal(uuid) from anon;
grant execute on function public.set_public_goal(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Part 3 — Goal invitations
-- ----------------------------------------------------------------------------

create table public.goal_share_invites (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references public.goals(id) on delete cascade,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  invitee_id   uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint goal_share_invites_no_self check (owner_id <> invitee_id)
);

-- One live invite per (goal, invitee). Declined/withdrawn rows stay as history
-- so a fresh invite after a decline is allowed.
create unique index goal_share_invites_live_pair
  on public.goal_share_invites (goal_id, invitee_id)
  where status in ('pending', 'accepted');

create index goal_share_invites_invitee_status_idx
  on public.goal_share_invites (invitee_id, status, created_at desc);
create index goal_share_invites_owner_goal_idx
  on public.goal_share_invites (owner_id, goal_id);

alter table public.goal_share_invites enable row level security;

create policy "Owner or invitee can read goal invites" on public.goal_share_invites
  for select using (auth.uid() in (owner_id, invitee_id));

-- No insert/update/delete policies: all mutations go through the RPCs below.
grant select on table public.goal_share_invites to authenticated;

create or replace function public.send_goal_invites(p_goal_id uuid, p_invitee_ids uuid[])
returns setof uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitee uuid;
  v_invite_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'unauthorized';
  end if;

  if coalesce(cardinality(p_invitee_ids), 0) = 0 or cardinality(p_invitee_ids) > 50 then
    raise exception using errcode = '22023', message = 'invalid_invitee_count';
  end if;

  if not exists (
    select 1 from public.goals g
    where g.id = p_goal_id
      and g.user_id = v_user_id
      and g.status in ('active', 'complete', 'stagnant')
  ) then
    raise exception using errcode = 'P0002', message = 'goal_not_found_or_not_shareable';
  end if;

  foreach v_invitee in array (select array_agg(distinct x) from unnest(p_invitee_ids) x)
  loop
    if not public.are_friends(v_user_id, v_invitee) then
      raise exception using errcode = '42501', message = 'invitee_not_a_friend';
    end if;

    insert into public.goal_share_invites (goal_id, owner_id, invitee_id)
    values (p_goal_id, v_user_id, v_invitee)
    on conflict (goal_id, invitee_id) where status in ('pending', 'accepted')
    do nothing
    returning id into v_invite_id;

    if v_invite_id is null then
      select id into v_invite_id
      from public.goal_share_invites
      where goal_id = p_goal_id
        and invitee_id = v_invitee
        and status in ('pending', 'accepted');
    end if;

    return next v_invite_id;
    v_invite_id := null;
  end loop;
end;
$$;

create or replace function public.respond_to_goal_invite(p_invite_id uuid, p_response text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'unauthorized';
  end if;
  if p_response not in ('accepted', 'declined') then
    raise exception using errcode = '22023', message = 'invalid_response';
  end if;

  update public.goal_share_invites
    set status = p_response, responded_at = now()
  where id = p_invite_id
    and invitee_id = v_user_id
    and status = 'pending'
  returning id into v_id;

  if v_id is null then
    raise exception using errcode = 'P0002', message = 'goal_invite_not_found_or_already_handled';
  end if;
  return v_id;
end;
$$;

-- Owner withdraws a pending invite or revokes an accepted one.
create or replace function public.withdraw_goal_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'unauthorized';
  end if;

  update public.goal_share_invites
    set status = 'withdrawn', responded_at = now()
  where id = p_invite_id
    and owner_id = v_user_id
    and status in ('pending', 'accepted')
  returning id into v_id;

  if v_id is null then
    raise exception using errcode = 'P0002', message = 'goal_invite_not_found_or_already_handled';
  end if;
  return v_id;
end;
$$;

revoke all on function public.send_goal_invites(uuid, uuid[]) from public, anon;
revoke all on function public.respond_to_goal_invite(uuid, text) from public, anon;
revoke all on function public.withdraw_goal_invite(uuid) from public, anon;
grant execute on function public.send_goal_invites(uuid, uuid[]) to authenticated;
grant execute on function public.respond_to_goal_invite(uuid, text) to authenticated;
grant execute on function public.withdraw_goal_invite(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Part 4 — Whitelisted Goal summaries for viewers
-- ----------------------------------------------------------------------------

-- INTERNAL: never granted to clients. Builds the only shape a non-owner sees.
-- Progress rule (design D-003): top-level milestones completed / total, plus
-- this week's Task count in the OWNER's timezone (Monday-start week).
create or replace function public.circles_goal_summary(p_goal_id uuid, p_access text)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with g as (
    select g.id, g.user_id, g.title, g.category, g.status
    from public.goals g
    where g.id = p_goal_id
  ),
  tz as (
    select coalesce(nullif(p.timezone, ''), 'UTC') as zone
    from g left join public.profiles p on p.id = g.user_id
  ),
  week as (
    select date_trunc('week', now() at time zone tz.zone)::date as start_date
    from tz
  ),
  weekly as (
    select
      count(*) filter (where o.status = 'completed') as done,
      count(*) filter (where o.status <> 'cancelled') as target
    from public.task_occurrences o
    join public.tasks t on t.id = o.task_id
    join g on g.id = t.goal_id
    cross join week
    where t.status = 'active'
      and o.scheduled_local_date >= week.start_date
      and o.scheduled_local_date < week.start_date + 7
  )
  select jsonb_build_object(
    'id', g.id,
    'owner_id', g.user_id,
    'title', g.title,
    'category', g.category,
    'status', g.status,
    'access', p_access,
    'milestones', coalesce((
      select jsonb_agg(
        jsonb_build_object('title', m.title, 'done', m.completed_at is not null)
        order by m.sort_order, m.created_at
      )
      from public.milestones m
      where m.goal_id = g.id and m.parent_id is null
    ), '[]'::jsonb),
    'weekly_task', (
      select case when weekly.target > 0
        then jsonb_build_object('done', weekly.done, 'target', weekly.target)
        else null end
      from weekly
    )
  )
  from g;
$$;

revoke all on function public.circles_goal_summary(uuid, text) from public, anon, authenticated;

-- Single Goal, if the caller may view it. NULL otherwise (no existence leak).
create or replace function public.get_viewable_goal(p_goal_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
  v_visibility text;
  v_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'unauthorized';
  end if;

  select g.user_id, g.visibility, g.status
    into v_owner, v_visibility, v_status
  from public.goals g where g.id = p_goal_id;

  if v_owner is null or v_status not in ('active', 'complete', 'stagnant') then
    return null;
  end if;
  if v_owner = v_user_id then
    return public.circles_goal_summary(p_goal_id, 'owner');
  end if;
  if not public.are_friends(v_owner, v_user_id) then
    return null;
  end if;
  if v_visibility = 'public' then
    return public.circles_goal_summary(p_goal_id, 'public');
  end if;
  if exists (
    select 1 from public.goal_share_invites i
    where i.goal_id = p_goal_id and i.invitee_id = v_user_id and i.status = 'accepted'
  ) then
    return public.circles_goal_summary(p_goal_id, 'invited');
  end if;
  return null;
end;
$$;

-- "Shared with You": accepted invites from current friends.
create or replace function public.list_goals_shared_with_me()
returns setof jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select public.circles_goal_summary(i.goal_id, 'invited')
  from public.goal_share_invites i
  join public.goals g on g.id = i.goal_id
  where i.invitee_id = auth.uid()
    and i.status = 'accepted'
    and g.status in ('active', 'complete', 'stagnant')
    and public.are_friends(i.owner_id, auth.uid())
  order by i.responded_at desc nulls last;
$$;

-- Requests: pending invites, with the same whitelisted preview.
create or replace function public.list_my_goal_invites()
returns table (invite_id uuid, created_at timestamptz, goal jsonb)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select i.id, i.created_at, public.circles_goal_summary(i.goal_id, 'invited')
  from public.goal_share_invites i
  join public.goals g on g.id = i.goal_id
  where i.invitee_id = auth.uid()
    and i.status = 'pending'
    and g.status in ('active', 'complete', 'stagnant')
    and public.are_friends(i.owner_id, auth.uid())
  order by i.created_at desc;
$$;

-- Every friend's single public Goal.
create or replace function public.list_friend_public_goals()
returns setof jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select public.circles_goal_summary(g.id, 'public')
  from public.goals g
  where g.visibility = 'public'
    and g.status in ('active', 'complete', 'stagnant')
    and public.are_friends(g.user_id, auth.uid());
$$;

revoke all on function public.get_viewable_goal(uuid) from public, anon;
revoke all on function public.list_goals_shared_with_me() from public, anon;
revoke all on function public.list_my_goal_invites() from public, anon;
revoke all on function public.list_friend_public_goals() from public, anon;
grant execute on function public.get_viewable_goal(uuid) to authenticated;
grant execute on function public.list_goals_shared_with_me() to authenticated;
grant execute on function public.list_my_goal_invites() to authenticated;
grant execute on function public.list_friend_public_goals() to authenticated;

-- ----------------------------------------------------------------------------
-- Part 5 — Feed: posts, encouragements, comments, saves
-- ----------------------------------------------------------------------------

create table public.circle_posts (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles(id) on delete cascade,
  post_kind        text not null default 'reflection'
                   check (post_kind in ('reflection', 'milestone', 'goal_complete')),
  body             text not null check (length(btrim(body)) between 1 and 2000),
  image_path       text,
  link_kind        text check (link_kind in ('goal', 'milestone', 'reflection')),
  link_ref_id      uuid,
  link_title       text check (link_title is null or length(link_title) <= 300),
  link_description text check (link_description is null or length(link_description) <= 280),
  link_category    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  constraint circle_posts_link_shape check (
    (link_kind is null and link_ref_id is null and link_title is null and link_description is null and link_category is null)
    or (link_kind is not null and link_ref_id is not null and link_title is not null)
  )
);

create index circle_posts_author_created_idx
  on public.circle_posts (author_id, created_at desc) where deleted_at is null;
create index circle_posts_created_idx
  on public.circle_posts (created_at desc) where deleted_at is null;

alter table public.circle_posts enable row level security;

create policy "Author and friends can read live posts" on public.circle_posts
  for select using (
    deleted_at is null
    and (author_id = auth.uid() or public.are_friends(author_id, auth.uid()))
  );

-- Inserts and soft deletes go through RPCs (ownership validation + snapshot).
grant select on table public.circle_posts to authenticated;

create table public.post_encouragements (
  post_id    uuid not null references public.circle_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_encouragements_user_idx on public.post_encouragements (user_id);

alter table public.post_encouragements enable row level security;

create policy "Viewers of a post can read its encouragements" on public.post_encouragements
  for select using (exists (select 1 from public.circle_posts p where p.id = post_id));
create policy "Viewers can encourage as themselves" on public.post_encouragements
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.circle_posts p where p.id = post_id)
  );
create policy "Users can remove own encouragement" on public.post_encouragements
  for delete using (user_id = auth.uid());

grant select, insert, delete on table public.post_encouragements to authenticated;

create table public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.circle_posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index post_comments_post_created_idx
  on public.post_comments (post_id, created_at) where deleted_at is null;

alter table public.post_comments enable row level security;

create policy "Viewers of a post can read live comments" on public.post_comments
  for select using (
    deleted_at is null
    and exists (select 1 from public.circle_posts p where p.id = post_id)
  );
create policy "Viewers can comment as themselves" on public.post_comments
  for insert with check (
    author_id = auth.uid()
    and deleted_at is null
    and exists (select 1 from public.circle_posts p where p.id = post_id)
  );
-- Soft delete only: the author may set deleted_at on their own comment.
create policy "Authors can soft delete own comments" on public.post_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

grant select, insert on table public.post_comments to authenticated;
grant update (deleted_at) on table public.post_comments to authenticated;

create table public.saved_posts (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.circle_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index saved_posts_user_created_idx on public.saved_posts (user_id, created_at desc);

alter table public.saved_posts enable row level security;

create policy "Users can read own saves" on public.saved_posts
  for select using (user_id = auth.uid());
create policy "Users can save visible posts" on public.saved_posts
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.circle_posts p where p.id = post_id)
  );
create policy "Users can unsave own posts" on public.saved_posts
  for delete using (user_id = auth.uid());

grant select, insert, delete on table public.saved_posts to authenticated;

-- Create a post. Validates that a linked item belongs to the author and
-- snapshots its title server-side; the description is author-written (D-005).
create or replace function public.create_circle_post(
  p_body text,
  p_image_path text default null,
  p_link_kind text default null,
  p_link_ref_id uuid default null,
  p_link_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text;
  v_category text;
  v_post_kind text := 'reflection';
  v_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'unauthorized';
  end if;

  if (p_link_kind is null) <> (p_link_ref_id is null) then
    raise exception using errcode = '22023', message = 'invalid_link';
  end if;

  if p_link_kind = 'goal' then
    select g.title, g.category into v_title, v_category
    from public.goals g
    where g.id = p_link_ref_id and g.user_id = v_user_id
      and g.status in ('active', 'complete', 'stagnant');
  elsif p_link_kind = 'milestone' then
    select m.title, g.category into v_title, v_category
    from public.milestones m
    join public.goals g on g.id = m.goal_id
    where m.id = p_link_ref_id and m.user_id = v_user_id;
    v_post_kind := 'milestone';
  elsif p_link_kind = 'reflection' then
    -- Untitled reflections still link; a missing/foreign/non-reflection row
    -- leaves v_title NULL and is rejected below.
    select coalesce(nullif(btrim(e.title), ''), 'Reflection') into v_title
    from public.entries e
    where e.id = p_link_ref_id and e.user_id = v_user_id and e.entry_type = 'reflection';
  elsif p_link_kind is not null then
    raise exception using errcode = '22023', message = 'invalid_link_kind';
  end if;

  if p_link_kind is not null and v_title is null then
    raise exception using errcode = 'P0002', message = 'link_not_found';
  end if;

  insert into public.circle_posts (
    author_id, post_kind, body, image_path,
    link_kind, link_ref_id, link_title, link_description, link_category
  ) values (
    v_user_id, v_post_kind, p_body, p_image_path,
    p_link_kind, p_link_ref_id, v_title,
    nullif(btrim(coalesce(p_link_description, '')), ''), v_category
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_circle_post(p_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  update public.circle_posts
    set deleted_at = now(), updated_at = now()
  where id = p_post_id and author_id = auth.uid() and deleted_at is null
  returning id into v_id;

  if v_id is null then
    raise exception using errcode = 'P0002', message = 'post_not_found';
  end if;
  return v_id;
end;
$$;

-- Feed page, newest first. SECURITY INVOKER so circle_posts RLS applies.
create or replace function public.get_circles_feed(
  p_before timestamptz default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  author_id uuid,
  post_kind text,
  body text,
  image_path text,
  link_kind text,
  link_ref_id uuid,
  link_title text,
  link_description text,
  link_category text,
  created_at timestamptz,
  encouragement_count bigint,
  comment_count bigint,
  encouraged_by_me boolean,
  saved_by_me boolean
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    p.id, p.author_id, p.post_kind, p.body, p.image_path,
    p.link_kind, p.link_ref_id, p.link_title, p.link_description, p.link_category,
    p.created_at,
    (select count(*) from public.post_encouragements e where e.post_id = p.id),
    (select count(*) from public.post_comments c where c.post_id = p.id and c.deleted_at is null),
    exists (select 1 from public.post_encouragements e where e.post_id = p.id and e.user_id = auth.uid()),
    exists (select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = auth.uid())
  from public.circle_posts p
  where p_before is null or p.created_at < p_before
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.create_circle_post(text, text, text, uuid, text) from public, anon;
revoke all on function public.delete_circle_post(uuid) from public, anon;
revoke all on function public.get_circles_feed(timestamptz, integer) from public, anon;
grant execute on function public.create_circle_post(text, text, text, uuid, text) to authenticated;
grant execute on function public.delete_circle_post(uuid) to authenticated;
grant execute on function public.get_circles_feed(timestamptz, integer) to authenticated;
