-- ============================================================================
-- 007_echo_title_and_brt_split.sql
-- Additive only. Does not touch 001-006.
--
-- Scope: adds title (user-written entry title) and brt_ai / brt_user (split
-- of the existing brt column for future dual-write of AI vs. human-edited
-- BRT classification) to echo_entries. The existing brt column is untouched
-- and remains the column currently written/read by all call sites.
-- ============================================================================

alter table public.echo_entries add column title text;
alter table public.echo_entries add column brt_ai jsonb;
alter table public.echo_entries add column brt_user jsonb;
