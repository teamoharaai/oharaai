-- Goals V2.2 (069): owner-authorized creation and later audience management.
-- Public retains the existing accepted-friends-only curated representation.
create function public.set_goal_visibility_v2(p_goal_id uuid,p_visibility text,p_audience uuid[] default '{}')
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare owner uuid := auth.uid(); friend_id uuid; current_status text;
begin
  if owner is null then raise exception 'Unauthorized'; end if;
  if p_visibility not in ('private','circle','public') or p_visibility is null then raise exception 'Invalid visibility'; end if;
  -- Same per-owner serialization used by New Phase, plus target row locking.
  perform 1 from public.profiles where id=owner for update;
  select status into current_status from public.goals where id=p_goal_id and user_id=owner for update;
  if not found then raise exception 'Goal not found'; end if;
  if p_visibility <> 'private' and current_status not in ('active','complete','stagnant') then
    raise exception 'Goal is not shareable in its current state';
  end if;
  if p_visibility='circle' then
    if coalesce(cardinality(p_audience),0)=0 or cardinality(p_audience)>50 then raise exception 'Choose 1–50 friends'; end if;
    foreach friend_id in array p_audience loop
      if not public.are_friends(owner,friend_id) then raise exception 'Audience must contain accepted friends'; end if;
    end loop;
  end if;
  -- Retain revoked invitations as history, never silently accept new invitations.
  update public.goal_share_invites set status='withdrawn',responded_at=now()
    where goal_id=p_goal_id and owner_id=owner and status in ('pending','accepted')
      and (p_visibility<>'circle' or not(invitee_id=any(p_audience)));
  if p_visibility='public' then
    perform public.set_public_goal(p_goal_id);
  else
    update public.goals set visibility=p_visibility,updated_at=now() where id=p_goal_id;
    if p_visibility='circle' then perform public.send_goal_invites(p_goal_id,p_audience); end if;
  end if;
end $$;
revoke all on function public.set_goal_visibility_v2(uuid,text,uuid[]) from public,anon;
grant execute on function public.set_goal_visibility_v2(uuid,text,uuid[]) to authenticated;
