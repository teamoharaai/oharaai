-- Replace legacy boolean sharing with explicit goal visibility states.
-- Existing shared goals backfill to "circle" to avoid silently widening access.

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS visibility text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'goals'
      AND column_name = 'is_public'
  ) THEN
    EXECUTE $sql$
      UPDATE public.goals
      SET visibility = 'circle'
      WHERE is_public = true
    $sql$;

    EXECUTE $sql$
      UPDATE public.goals
      SET visibility = 'private'
      WHERE is_public = false OR is_public IS NULL
    $sql$;
  END IF;
END $$;

UPDATE public.goals
SET visibility = 'private'
WHERE visibility IS NULL;

ALTER TABLE public.goals
  ALTER COLUMN visibility SET DEFAULT 'private';

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_visibility_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_visibility_check
  CHECK (visibility IN ('private', 'circle', 'public'));

ALTER TABLE public.goals
  ALTER COLUMN visibility SET NOT NULL;

DROP POLICY IF EXISTS "Users can view public goals" ON public.goals;

DROP INDEX IF EXISTS idx_goals_is_public;
DROP INDEX IF EXISTS idx_goals_visibility;
CREATE INDEX IF NOT EXISTS idx_goals_visibility ON public.goals(visibility);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'goals'
      AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.goals DROP COLUMN is_public;
  END IF;
END $$;
