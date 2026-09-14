-- Migration 046: production-aligned Tracker log read index.
--
-- This migration was applied to the linked production database before
-- Migration 045. Keeping the exact statements in the repository makes clean
-- installs reproducible and allows Supabase's supported --include-all flow to
-- apply the missing 045 migration without replaying this already-recorded one.

create index if not exists tracker_logs_tracker_id_logged_at_idx
  on public.tracker_logs (tracker_id, logged_at desc) include (id, value);

drop index if exists public.idx_tracker_logs_tracker_id;
