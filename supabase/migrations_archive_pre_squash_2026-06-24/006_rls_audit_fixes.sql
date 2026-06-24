-- Audit follow-up: make RLS coverage explicit for every CRUD action on the
-- newly added tables, and add explicit deny policies where writes should not
-- be allowed.

-- ─── Profiles explicit delete deny ───────────────────────────────────────────
CREATE POLICY "Users cannot delete profiles"
  ON public.profiles FOR DELETE
  USING (false);

-- ─── Measurables explicit CRUD policies ─────────────────────────────────────
DROP POLICY IF EXISTS "Users can CRUD measurables for own goals" ON public.measurables;

CREATE POLICY "Users can select measurables for own goals"
  ON public.measurables FOR SELECT
  USING (goal_id IN (
    SELECT id FROM public.goals WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert measurables for own goals"
  ON public.measurables FOR INSERT
  WITH CHECK (goal_id IN (
    SELECT id FROM public.goals WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update measurables for own goals"
  ON public.measurables FOR UPDATE
  USING (goal_id IN (
    SELECT id FROM public.goals WHERE user_id = auth.uid()
  ))
  WITH CHECK (goal_id IN (
    SELECT id FROM public.goals WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete measurables for own goals"
  ON public.measurables FOR DELETE
  USING (goal_id IN (
    SELECT id FROM public.goals WHERE user_id = auth.uid()
  ));

-- ─── Measurable logs explicit CRUD policies ─────────────────────────────────
DROP POLICY IF EXISTS "Users can CRUD own measurable logs" ON public.measurable_logs;

CREATE POLICY "Users can select own measurable logs"
  ON public.measurable_logs FOR SELECT
  USING (measurable_id IN (
    SELECT m.id FROM public.measurables m
    JOIN public.goals g ON m.goal_id = g.id
    WHERE g.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own measurable logs"
  ON public.measurable_logs FOR INSERT
  WITH CHECK (measurable_id IN (
    SELECT m.id FROM public.measurables m
    JOIN public.goals g ON m.goal_id = g.id
    WHERE g.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own measurable logs"
  ON public.measurable_logs FOR UPDATE
  USING (measurable_id IN (
    SELECT m.id FROM public.measurables m
    JOIN public.goals g ON m.goal_id = g.id
    WHERE g.user_id = auth.uid()
  ))
  WITH CHECK (measurable_id IN (
    SELECT m.id FROM public.measurables m
    JOIN public.goals g ON m.goal_id = g.id
    WHERE g.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own measurable logs"
  ON public.measurable_logs FOR DELETE
  USING (measurable_id IN (
    SELECT m.id FROM public.measurables m
    JOIN public.goals g ON m.goal_id = g.id
    WHERE g.user_id = auth.uid()
  ));

-- ─── AI usage explicit deny policies for unsupported writes ─────────────────
CREATE POLICY "Users cannot update AI usage"
  ON public.ai_usage FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Users cannot delete AI usage"
  ON public.ai_usage FOR DELETE
  USING (false);
