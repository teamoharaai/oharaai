-- ============================================================================
-- 009_echo_ai_status.sql
-- Additive only. Does not touch 001-008.
--
-- Scope: adds ai_status to echo_entries so that not_requested / pending /
-- completed / failed states are distinguishable without relying on the
-- collapsed summarized=false signal, which conflated all three non-success
-- states.
--
-- summarized is NOT removed — it is still written and read by reconcile.
-- ai_status is additive, not a replacement.
-- ============================================================================

alter table public.echo_entries
  add column if not exists ai_status text not null default 'not_requested'
    check (ai_status in ('not_requested', 'pending', 'completed', 'failed'));

-- Backfill: entries with a confirmed AI response are completed.
-- All other existing rows remain 'not_requested' — historically there was no
-- way to distinguish failed from not-requested, so not_requested is the safe
-- default for pre-existing rows with summarized=false.
update public.echo_entries
  set ai_status = 'completed'
  where summarized = true;
