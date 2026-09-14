-- 046_tracker_logs_period_index.sql
-- Tracker Metrics — Task 2: period-query index for tracker_logs.
--
-- The tracker-metrics read path derives period state by fetching a tracker's
-- logs within a half-open [lower bound, asOf) window, ordered by logged_at.
-- This compound covering index serves that access pattern
-- (tracker_id equality + logged_at range/order) and includes id + value so the
-- derivation can be satisfied from the index alone.
--
-- The pre-existing single-column btree idx_tracker_logs_tracker_id is a strict
-- leading-column prefix of the new index and is therefore redundant once this
-- index exists; it is dropped in the same migration.
--
-- tracker_logs is tiny (37 rows at time of writing), so a normal transactional
-- index build carries no meaningful lock risk; CONCURRENTLY is unnecessary.
-- No column, RLS, or data changes.

create index if not exists tracker_logs_tracker_id_logged_at_idx
  on public.tracker_logs (tracker_id, logged_at desc)
  include (id, value);

drop index if exists public.idx_tracker_logs_tracker_id;
