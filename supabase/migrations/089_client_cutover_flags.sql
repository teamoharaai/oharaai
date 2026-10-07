-- Per-account desktop cut-over flag (TD-005 phase b, B6). Design: design/ios-core/TD-005-desktop-work-cutover.md
-- (iOS repo), agreed 2026-09-29; flip order and this migration's scope confirmed with Justin 2026-10-06
-- (session 024): milestone_work_v1 flips first, verified (B8), before activity_window_v1 is flipped
-- separately behind a fresh preflight reconfirming D4's gate.
--
-- * goal_private.client_cutover(owner_id, feature): a row means that account's desktop build takes the new
--   path for that feature. Modelled on 072's verification_owners (an allowlist, not a kill switch: there is
--   no "enabled" bit here, because nothing on the backend needs disabling — only the client's own read gates
--   on it). Features: milestone_work_v1 (desktop Milestone writes and Goal create/clone Milestones move onto
--   goal_work_v1, B7) and activity_window_v1 (desktop's activity-window route reads goal_activity_v1, once a
--   later preflight reconfirms D4's gate). Rows are set and cleared by an approved SQL step, same process as
--   072's verification_owners.
-- * public.my_client_cutovers_v1(): the only way a client learns its own flags, since goal_private has no
--   client-facing grants (072). Owner-scoped by request_owner() (072); unauthenticated calls get UNAUTHORIZED.
-- * Schema only. This migration writes no rows, and no backend or desktop code reads the table or calls the
--   function yet: desktop's TS wiring is a separate change (B7, A6) that stays behind this flag, default off.
-- Depends on 072.
begin;
-- Hosted migrations run as a non-superuser; ownership transfer needs temporary membership (see 072).
grant goal_manual_executor to current_user;
grant create on schema public, goal_private to goal_manual_executor;

create table goal_private.client_cutover (
  owner_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('milestone_work_v1', 'activity_window_v1')),
  primary key (owner_id, feature)
);
grant select on goal_private.client_cutover to goal_manual_executor;

create function public.my_client_cutovers_v1() returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,goal_private
set statement_timeout='5s' as $$
declare owner uuid := goal_private.request_owner(); features jsonb;
begin
  if owner is null then return goal_private.fail('UNAUTHORIZED'); end if;
  select coalesce(jsonb_agg(feature order by feature), '[]'::jsonb) into features
    from goal_private.client_cutover where owner_id = owner;
  return jsonb_build_object('ok', true, 'data', jsonb_build_object('features', features));
end $$;

revoke all on function public.my_client_cutovers_v1() from public, anon, service_role;
alter function public.my_client_cutovers_v1() owner to goal_manual_executor;
grant execute on function public.my_client_cutovers_v1() to authenticated;

revoke create on schema public, goal_private from goal_manual_executor;
revoke goal_manual_executor from current_user;
commit;
