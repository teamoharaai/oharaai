-- Production-shaped Echo history for scripts/db-chain/apply-rehearsal.sh while hosted is before Migration 086:
-- a desktop capture filed under the seed Goal with no canonical Entry (086's backlog copies it, adding one
-- Echo-owned goal_events row, which the --apply invariant allows), and a canonical Note with no link (the
-- rehearsal's second defect links it, adding a goal_events row the invariant must refuse).
insert into public.echo_entries(id, user_id, content, created_at) values
  ('5eed0000-0000-4000-8000-0000000000a1', '5eed0000-0000-4000-8000-000000000001', 'Seed Echo capture', now() - interval '1 day');
insert into public.echo_entry_links(echo_entry_id, goal_id, container_type, link_source, confirmed) values
  ('5eed0000-0000-4000-8000-0000000000a1', '5eed0000-0000-4000-8000-00000000000a', 'goal', 'manual', true);
insert into public.entries(id, user_id, entry_type) values
  ('5eed0000-0000-4000-8000-0000000000a2', '5eed0000-0000-4000-8000-000000000001', 'note');
