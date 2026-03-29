-- Rename starlog_entries columns to align with application layer conventions.
-- raw_text  → content             (clearer name, no "raw" implication)
-- ai_opted_in → ai_insight_requested  (matches UI toggle label)

ALTER TABLE public.starlog_entries
  RENAME COLUMN raw_text TO content;

ALTER TABLE public.starlog_entries
  RENAME COLUMN ai_opted_in TO ai_insight_requested;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_starlog_entries_user_id
  ON public.starlog_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_starlog_entries_created_at
  ON public.starlog_entries(created_at DESC);
