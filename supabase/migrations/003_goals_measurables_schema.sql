-- ─── Extend goals table with new columns ─────────────────────────────────────
-- goals already exists from 001; add columns introduced in this phase
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS color_theme text NOT NULL DEFAULT 'ocean',
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS progress numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;

-- ─── Extend echo_entries with new columns ──────────────────────────────────
-- echo_entries already exists from 001; rename + add columns for this phase
-- Rename entry_text → raw_text (no data yet; safe to rename)
ALTER TABLE public.echo_entries
  RENAME COLUMN entry_text TO raw_text;

-- Drop old bud/rose/thorn column; replaced by GROWTH/REALITY/OBSTACLE below
ALTER TABLE public.echo_entries
  DROP COLUMN IF EXISTS brt_classification;

ALTER TABLE public.echo_entries
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS ai_opted_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS classification text CHECK (classification IN ('GROWTH', 'REALITY', 'OBSTACLE')),
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS themes text[],
  ADD COLUMN IF NOT EXISTS ai_response text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- ─── Measurables ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.measurables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id         uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title           text NOT NULL,
  type            text NOT NULL CHECK (type IN ('counter', 'habit', 'checklist')),
  target_value    numeric,
  target_unit     text,
  frequency       text CHECK (frequency IN ('daily', 'weekly', 'monthly', 'once')),
  current_value   numeric NOT NULL DEFAULT 0,
  is_ai_suggested boolean NOT NULL DEFAULT false,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Measurable logs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.measurable_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurable_id  uuid NOT NULL REFERENCES public.measurables(id) ON DELETE CASCADE,
  value          numeric NOT NULL DEFAULT 1,
  note           text,
  logged_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── AI usage tracking ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pipeline      text NOT NULL,
  model         text NOT NULL,
  input_tokens  int NOT NULL,
  output_tokens int NOT NULL,
  latency_ms    int NOT NULL,
  cached        boolean NOT NULL DEFAULT false,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.measurables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurable_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Goals: additional policy allowing any user to read public goals
-- (own-goal CRUD policies already added in 002_enable_rls.sql)
CREATE POLICY "Users can view public goals"
  ON public.goals FOR SELECT
  USING (is_public = true);

-- Measurables: access through goal ownership
CREATE POLICY "Users can CRUD measurables for own goals"
  ON public.measurables FOR ALL
  USING (goal_id IN (SELECT id FROM public.goals WHERE user_id = auth.uid()));

-- Measurable logs: access through measurable → goal ownership
CREATE POLICY "Users can CRUD own measurable logs"
  ON public.measurable_logs FOR ALL
  USING (measurable_id IN (
    SELECT m.id FROM public.measurables m
    JOIN public.goals g ON m.goal_id = g.id
    WHERE g.user_id = auth.uid()
  ));

-- AI usage: users see only their own
CREATE POLICY "Users can read own AI usage"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert AI usage"
  ON public.ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_goals_status          ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_is_public        ON public.goals(is_public);
CREATE INDEX IF NOT EXISTS idx_measurables_goal_id    ON public.measurables(goal_id);
CREATE INDEX IF NOT EXISTS idx_measurable_logs_mid    ON public.measurable_logs(measurable_id);
CREATE INDEX IF NOT EXISTS idx_echo_goal_id        ON public.echo_entries(goal_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id       ON public.ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_pipeline      ON public.ai_usage(pipeline);
