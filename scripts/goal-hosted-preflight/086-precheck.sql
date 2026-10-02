-- 086 pre-check, read-only and counts only (no content, no IDs). Runs before 086 is applied, inside the preflight
-- transaction, so it shows what 086's one-time backlog copy will add (TD-005 §3) and what B10 makes read-only.
-- It never blocks: gate_086 and clean_086 are always true. The --apply invariant still requires that existing rows
-- stay unchanged and that goal_events gains Echo-owned Entry events only.
with echo_goal as ( -- the Goal Echo shows for each entry (086's goal_private.echo_entry_goals, inlined)
  select ee.id as entry_id, g.id as goal_id
  from public.echo_entries ee
  left join lateral (
    select l.container_type, l.goal_id from public.echo_entry_links l
    where l.echo_entry_id = ee.id and l.confirmed order by l.created_at, l.id limit 1
  ) container on true
  join public.goals g on g.user_id = ee.user_id
    and g.id = case when container.container_type is null then ee.goal_id
                    when container.container_type = 'goal' then container.goal_id end
)
select
  (select count(*) from public.echo_entries) as echo_entries,
  (select count(*) from public.echo_entries ee where not exists (select 1 from public.entries e where e.id = ee.id)) as without_canonical,
  (select count(distinct ee.user_id) from public.echo_entries ee where not exists (select 1 from public.entries e where e.id = ee.id)) as without_canonical_owners,
  (select count(*) from echo_goal w where not exists (
     select 1 from public.entry_goal_links c where c.entry_id = w.entry_id and c.goal_id = w.goal_id)) as goal_links_to_add,
  (select count(*) from public.entries e join public.echo_entries ee on ee.id = e.id
    where e.plain_text is distinct from ee.content or e.title is distinct from coalesce(nullif(btrim(ee.title), ''), 'Reflection')
       or e.entry_type <> 'reflection') as copies_edited_in_library,
  (select count(*) from public.entry_goal_links c join public.echo_entries ee on ee.id = c.entry_id
    where not exists (select 1 from echo_goal w where w.entry_id = c.entry_id and w.goal_id = c.goal_id)) as copy_goal_links_echo_does_not_show,
  (select count(*) from public.reflection_milestone_links r join public.echo_entries ee on ee.id = r.entry_id) as copy_milestone_links
\gset pre086_
\echo '086 pre-check: Echo entries:' :pre086_echo_entries
\echo '086 pre-check: Echo entries with no canonical Entry (the backlog copies them):' :pre086_without_canonical 'across owners:' :pre086_without_canonical_owners
\echo '086 pre-check: Goal links Echo shows with no canonical link (the backlog adds them; each adds a goal_events row):' :pre086_goal_links_to_add
\echo '086 pre-check: canonical copies edited in the library (kept by the backlog; the next Echo edit rewrites them, B10):' :pre086_copies_edited_in_library
\echo '086 pre-check: canonical copy Goal links Echo does not show (kept by the backlog; the next Echo edit or move drops them):' :pre086_copy_goal_links_echo_does_not_show
\echo '086 pre-check: canonical copy Milestone links (kept; read-only from now on):' :pre086_copy_milestone_links
select true as gate_086, true as clean_086 \gset
