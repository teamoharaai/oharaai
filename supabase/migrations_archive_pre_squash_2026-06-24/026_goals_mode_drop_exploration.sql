-- 'exploration' mode was scoped for a bored-user recommendation feature that was
-- never built and is now superseded by Echo + Vaults. 'commitment' is the only
-- value ever written (lib/db/goals.ts) or read anywhere in the app. Tighten the
-- CHECK to reflect reality; column itself stays (it still holds a real value).

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_mode_check;

ALTER TABLE public.goals
  ADD CONSTRAINT goals_mode_check
  CHECK (mode = 'commitment');
