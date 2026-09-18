\set ON_ERROR_STOP on

-- Migration 053 security + behavior assertions. Each block raises on failure.
-- Users: A (owner), B (A's friend), C (B's friend, NOT A's friend).

insert into auth.users(id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b'),
  ('00000000-0000-4000-8000-00000000000c');
insert into public.profiles(id, display_name, timezone) values
  ('00000000-0000-4000-8000-00000000000a', 'A', 'America/New_York'),
  ('00000000-0000-4000-8000-00000000000b', 'B', 'UTC'),
  ('00000000-0000-4000-8000-00000000000c', 'C', 'UTC');
insert into public.friend_connections(requester_id, addressee_id, status) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', 'accepted'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c', 'accepted');

insert into public.goals(id, user_id, title, description, category, status, reflection) values
  ('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a', 'Run a 5K', 'PRIVATE WHY', 'health', 'active', 'PRIVATE REFLECTION'),
  ('10000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000000a', 'Sleep early', 'PRIVATE', 'health', 'active', null),
  ('10000000-0000-4000-8000-00000000002a', '00000000-0000-4000-8000-00000000000a', 'Draft idea', null, 'growth', 'draft', null),
  ('10000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000b', 'B goal', null, 'career', 'active', null);
insert into public.milestones(goal_id, user_id, title, completed_at, sort_order) values
  ('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a', 'Run 1 mile', now(), 1),
  ('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a', 'Finish the race', null, 2);
insert into public.entries(id, user_id, entry_type, title, plain_text) values
  ('30000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a', 'reflection', 'Rest counts', 'PRIVATE BODY'),
  ('30000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000000a', 'note', 'A note', 'PRIVATE NOTE');
insert into public.tasks(id, user_id, goal_id, title) values
  ('40000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'PRIVATE TASK TITLE');
insert into public.task_occurrences(user_id, task_id, scheduled_local_date, status)
select '00000000-0000-4000-8000-00000000000a', '40000000-0000-4000-8000-00000000000a',
       date_trunc('week', now() at time zone 'America/New_York')::date + d, case when d < 2 then 'completed' else 'pending' end
from generate_series(0, 4) d;

set role authenticated;

-- ---------------------------------------------------------------- A: owner
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', false);

do $$
begin
  perform public.set_public_goal('10000000-0000-4000-8000-00000000000a');
  perform public.set_public_goal('10000000-0000-4000-8000-00000000001a');
  if (select count(*) from public.goals where visibility = 'public') <> 1 then
    raise exception 'set_public_goal did not keep exactly one public goal';
  end if;
  perform public.set_public_goal('10000000-0000-4000-8000-00000000000a');

  begin
    perform public.set_public_goal('10000000-0000-4000-8000-00000000002a');
    raise exception 'draft goal was allowed to become public';
  exception when sqlstate 'P0002' then null;
  end;

  begin
    update public.goals set visibility = 'public' where id = '10000000-0000-4000-8000-00000000001a';
    raise exception 'direct update created a second public goal';
  exception when unique_violation then null;
  end;

  begin
    perform public.set_public_goal('10000000-0000-4000-8000-00000000000b');
    raise exception 'user made another user''s goal public';
  exception when sqlstate 'P0002' then null;
  end;
end $$;

do $$
begin
  begin
    perform public.send_goal_invites('10000000-0000-4000-8000-00000000001a',
      array['00000000-0000-4000-8000-00000000000c']::uuid[]);
    raise exception 'invite to a non-friend was allowed';
  exception when insufficient_privilege then null;
  end;

  perform public.send_goal_invites('10000000-0000-4000-8000-00000000001a',
    array['00000000-0000-4000-8000-00000000000b','00000000-0000-4000-8000-00000000000b']::uuid[]);
  perform public.send_goal_invites('10000000-0000-4000-8000-00000000001a',
    array['00000000-0000-4000-8000-00000000000b']::uuid[]);
  if (select count(*) from public.goal_share_invites) <> 1 then
    raise exception 'duplicate live invites were created';
  end if;

  begin
    insert into public.goal_share_invites(goal_id, owner_id, invitee_id)
    values ('10000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000c');
    raise exception 'direct invite insert bypassed the RPC';
  exception when insufficient_privilege then null;
  end;

  perform public.create_circle_post('Evenings feel lighter', null, 'reflection',
    '30000000-0000-4000-8000-00000000000a', 'On slower weeks');

  begin
    perform public.create_circle_post('Linking a note', null, 'reflection', '30000000-0000-4000-8000-00000000001a', null);
    raise exception 'a note was linked as a reflection';
  exception when sqlstate 'P0002' then null;
  end;

  begin
    perform public.create_circle_post('Linking B goal', null, 'goal', '10000000-0000-4000-8000-00000000000b', null);
    raise exception 'user linked another user''s goal';
  exception when sqlstate 'P0002' then null;
  end;

  if (select link_title from public.circle_posts limit 1) <> 'Rest counts' then
    raise exception 'link title was not snapshotted server-side';
  end if;
end $$;

-- ---------------------------------------------------------------- B: friend
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', false);

do $$
declare
  v_summary jsonb;
  v_invite uuid;
begin
  if exists (select 1 from public.goals where user_id = '00000000-0000-4000-8000-00000000000a') then
    raise exception 'friend read owner goals directly';
  end if;
  if exists (select 1 from public.milestones where user_id = '00000000-0000-4000-8000-00000000000a') then
    raise exception 'friend read owner milestones directly';
  end if;

  select * into v_summary from public.list_friend_public_goals() limit 1;
  if v_summary is null or v_summary->>'title' <> 'Run a 5K' then
    raise exception 'friend cannot see the public goal';
  end if;
  if v_summary::text like '%PRIVATE%' then
    raise exception 'public goal summary leaked private fields: %', v_summary;
  end if;
  if jsonb_array_length(v_summary->'milestones') <> 2
     or (v_summary->'weekly_task'->>'done')::int <> 2
     or (v_summary->'weekly_task'->>'target')::int <> 5 then
    raise exception 'unexpected progress shape: %', v_summary;
  end if;

  if public.get_viewable_goal('10000000-0000-4000-8000-00000000001a') is not null then
    raise exception 'pending invite granted access before acceptance';
  end if;
  if (select count(*) from public.list_goals_shared_with_me()) <> 0 then
    raise exception 'shared-with-me listed a pending invite';
  end if;

  select invite_id into v_invite from public.list_my_goal_invites() limit 1;
  if v_invite is null then raise exception 'invitee cannot see pending invite'; end if;
  perform public.respond_to_goal_invite(v_invite, 'accepted');

  if public.get_viewable_goal('10000000-0000-4000-8000-00000000001a')->>'access' <> 'invited' then
    raise exception 'accepted invite did not grant view access';
  end if;
  if (select count(*) from public.list_goals_shared_with_me()) <> 1 then
    raise exception 'accepted goal missing from shared-with-me';
  end if;

  begin
    perform public.respond_to_goal_invite(v_invite, 'declined');
    raise exception 'invite was responded to twice';
  exception when sqlstate 'P0002' then null;
  end;

  if (select count(*) from public.get_circles_feed()) <> 1 then
    raise exception 'friend cannot see author''s post';
  end if;

  insert into public.post_encouragements(post_id, user_id)
  select id, '00000000-0000-4000-8000-00000000000b' from public.circle_posts limit 1;
  insert into public.saved_posts(post_id, user_id)
  select id, '00000000-0000-4000-8000-00000000000b' from public.circle_posts limit 1;
  insert into public.post_comments(post_id, author_id, body)
  select id, '00000000-0000-4000-8000-00000000000b', 'Proud of you' from public.circle_posts limit 1;
end $$;

-- ---------------------------------------------------------------- C: stranger
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000c', false);

do $$
begin
  if (select count(*) from public.list_friend_public_goals()) <> 0 then
    raise exception 'non-friend saw a public goal';
  end if;
  if public.get_viewable_goal('10000000-0000-4000-8000-00000000000a') is not null then
    raise exception 'non-friend viewed a public goal by id';
  end if;
  if (select count(*) from public.get_circles_feed()) <> 0 then
    raise exception 'non-friend saw a post';
  end if;
  if exists (select 1 from public.post_comments) or exists (select 1 from public.post_encouragements) then
    raise exception 'non-friend read comments or encouragements';
  end if;
  if exists (select 1 from public.saved_posts) then
    raise exception 'saves are not private';
  end if;

  begin
    insert into public.post_encouragements(post_id, user_id)
    select id, '00000000-0000-4000-8000-00000000000c' from public.circle_posts;
    if exists (select 1 from public.post_encouragements where user_id = '00000000-0000-4000-8000-00000000000c') then
      raise exception 'non-friend encouraged an invisible post';
    end if;
  end;
end $$;

-- ---------------------------------------------------------------- A: counts + revoke
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', false);

do $$
declare
  v_row record;
  v_invite uuid;
begin
  select * into v_row from public.get_circles_feed() limit 1;
  if v_row.encouragement_count <> 1 or v_row.comment_count <> 1 or v_row.saved_by_me then
    raise exception 'author feed counts/flags wrong: %', v_row;
  end if;
  if exists (select 1 from public.saved_posts) then
    raise exception 'author can see another user''s save';
  end if;

  select id into v_invite from public.goal_share_invites limit 1;
  perform public.withdraw_goal_invite(v_invite);
end $$;

-- ------------------------------------------- comment soft-delete (Migration 054)
-- Stranger C cannot delete a comment they don't own.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000c', false);
do $$
declare
  v_comment uuid;
begin
  select id into v_comment from public.post_comments limit 1;
  begin
    perform public.delete_circle_comment(v_comment);
    raise exception 'stranger soft-deleted a comment they do not own';
  exception when sqlstate 'P0002' then null;
  end;
  if (select count(*) from public.post_comments where deleted_at is not null) <> 0 then
    raise exception 'a comment was soft-deleted by a non-author';
  end if;
end $$;

-- Author B soft-deletes their own comment via the RPC (the direct UPDATE path
-- is gone; the RPC bypasses the deleted_at-is-null SELECT policy). Idempotent:
-- a second delete raises P0002.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', false);
do $$
declare
  v_comment uuid;
  v_returned uuid;
begin
  select id into v_comment from public.post_comments where author_id = '00000000-0000-4000-8000-00000000000b' limit 1;
  v_returned := public.delete_circle_comment(v_comment);
  if v_returned <> v_comment then
    raise exception 'delete_circle_comment returned the wrong id';
  end if;
  if (select comment_count from public.get_circles_feed() limit 1) <> 0 then
    raise exception 'soft-deleted comment still counted in the feed';
  end if;

  begin
    perform public.delete_circle_comment(v_comment);
    raise exception 'already-deleted comment did not raise not-found';
  exception when sqlstate 'P0002' then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', false);

do $$
begin
  if public.get_viewable_goal('10000000-0000-4000-8000-00000000001a') is not null then
    raise exception 'withdrawn invite still grants access';
  end if;
end $$;

-- ------------------------------------------------- feed pagination (get_circles_feed)
-- Seed a deterministic run of the author's own posts with stamped timestamps
-- (direct inserts as the superuser — 053 grants authenticated SELECT only, so
-- writes normally go through create_circle_post). created_at ascends by minute,
-- so BULK PAGE POST 55 is the newest. The author already has one live post from
-- the section above; the pagination assertions below use created_at aggregates
-- (order-independent) so that pre-existing post never skews them.
reset role;
insert into public.circle_posts (author_id, body, created_at)
select '00000000-0000-4000-8000-00000000000a',
       'BULK PAGE POST ' || i,
       timestamptz '2027-01-01 00:00:00+00' + make_interval(mins => i)
from generate_series(1, 55) i;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', false);

do $$
declare
  v_cursor timestamptz := '2027-01-01 00:50:00+00';
  v_newest timestamptz;
  v_cnt int;
  v_min timestamptz;
  v_max timestamptz;
begin
  select max(created_at) into v_newest from public.circle_posts
    where author_id = '00000000-0000-4000-8000-00000000000a' and deleted_at is null;

  -- Default page size is 20 (p_limit defaults to 20).
  if (select count(*) from public.get_circles_feed()) <> 20 then
    raise exception 'default feed page was not 20 rows';
  end if;

  -- Upper clamp: a larger requested limit is capped at 50.
  if (select count(*) from public.get_circles_feed(p_limit => 1000)) <> 50 then
    raise exception 'feed limit was not clamped down to 50';
  end if;

  -- Lower clamp: p_limit 0 clamps to 1, returning just the newest row.
  select count(*), min(created_at) into v_cnt, v_min
    from public.get_circles_feed(p_limit => 0);
  if v_cnt <> 1 or v_min <> v_newest then
    raise exception 'p_limit 0 did not return exactly the newest row: cnt=%, ts=%', v_cnt, v_min;
  end if;

  -- Newest-first: the top 3 rows are the three most recent posts (00:55/54/53).
  select count(*), min(created_at) into v_cnt, v_min from public.get_circles_feed(p_limit => 3);
  if v_cnt <> 3 or v_min <> timestamptz '2027-01-01 00:53:00+00' then
    raise exception 'top-3 page was not the three newest posts: cnt=%, min=%', v_cnt, v_min;
  end if;

  -- p_before returns only rows strictly older than the cursor.
  select max(created_at) into v_max from public.get_circles_feed(p_before => v_cursor, p_limit => 1000);
  if v_max >= v_cursor then
    raise exception 'p_before returned a row at or after the cursor: %', v_max;
  end if;

  -- p_before + p_limit returns the newest rows below the cursor (00:49 then 00:48).
  select count(*), max(created_at), min(created_at) into v_cnt, v_max, v_min
    from public.get_circles_feed(p_before => v_cursor, p_limit => 2);
  if v_cnt <> 2
     or v_max <> timestamptz '2027-01-01 00:49:00+00'
     or v_min <> timestamptz '2027-01-01 00:48:00+00' then
    raise exception 'p_before + limit did not return the two newest older rows: cnt=%, max=%, min=%', v_cnt, v_max, v_min;
  end if;
end $$;

reset role;
select 'circles security: all assertions passed' as result;
