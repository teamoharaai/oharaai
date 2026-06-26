-- ============================================================================
-- 010_echo_retry_tracking.sql
-- Additive only. Does not touch 001-009.
--
-- Scope: adds retry_count and last_attempted_at to echo_entries so that
-- reconcile can cap retry attempts at 3 and enforce a 10-minute cooldown
-- between retries for failed AI generations.
--
-- ai_status (009) is the single filter/write target for reconcile.
-- retry_count: incremented on every failed attempt (primary path or reconcile).
-- last_attempted_at: set to now() on every failed attempt; null means never tried.
-- ============================================================================

alter table public.echo_entries
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_attempted_at timestamptz;
