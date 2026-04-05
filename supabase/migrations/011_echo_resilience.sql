-- Migration 011: Echo resilience
-- Adds `summarized` flag to echo_entries so save-first entries that never
-- received an AI response are distinguishable from successfully processed ones.
-- Adds `last_summarized_at` to profiles so the character profile pipeline knows
-- when it last incorporated Echo data.

alter table public.echo_entries
  add column if not exists summarized boolean not null default false;

alter table public.profiles
  add column if not exists last_summarized_at timestamptz;
