-- Update echo_entries schema for structured reflection metadata.
-- Replace legacy classification/publicity fields with JSONB analysis payloads
-- and explicit text visibility state for the current Echo model output.

ALTER TABLE public.echo_entries
  DROP COLUMN IF EXISTS classification,
  DROP COLUMN IF EXISTS is_public,
  ADD COLUMN IF NOT EXISTS brt jsonb,
  ADD COLUMN IF NOT EXISTS emotion jsonb,
  ADD COLUMN IF NOT EXISTS model_version text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

ALTER TABLE public.echo_entries
  ADD CONSTRAINT echo_entries_visibility_check
  CHECK (visibility IN ('private', 'shared'));
