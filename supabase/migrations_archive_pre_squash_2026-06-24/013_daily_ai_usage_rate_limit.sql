-- Enforce per-user daily AI quota through a single DB-backed counter.

CREATE TABLE IF NOT EXISTS public.daily_ai_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_ai_usage_user_date
  ON public.daily_ai_usage(user_id, date);

ALTER TABLE public.daily_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own daily AI usage" ON public.daily_ai_usage;
CREATE POLICY "Users can select own daily AI usage"
  ON public.daily_ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_daily_ai_quota(
  p_date date,
  p_limit integer DEFAULT 30
)
RETURNS TABLE(allowed boolean, count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user required';
  END IF;

  IF p_limit <= 0 THEN
    RAISE EXCEPTION 'Daily AI limit must be positive';
  END IF;

  INSERT INTO public.daily_ai_usage (user_id, date, count)
  VALUES (v_user_id, p_date, 1)
  ON CONFLICT (user_id, date) DO UPDATE
    SET count = public.daily_ai_usage.count + 1
    WHERE public.daily_ai_usage.count < p_limit
  RETURNING public.daily_ai_usage.count INTO v_count;

  IF v_count IS NOT NULL THEN
    RETURN QUERY SELECT true, v_count;
    RETURN;
  END IF;

  SELECT daily_ai_usage.count
  INTO v_count
  FROM public.daily_ai_usage
  WHERE daily_ai_usage.user_id = v_user_id
    AND daily_ai_usage.date = p_date;

  RETURN QUERY SELECT false, COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_daily_ai_quota(date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_daily_ai_quota(date, integer) TO authenticated;
