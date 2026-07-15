-- Migration 021: Enforce uniqueness on goals.previous_goal_id
-- Resolves OUTSTANDING.md gap: idx_goals_previous_goal_id (020) was a
-- partial index, not unique, allowing two concurrent extend-goal writes
-- to both succeed against the same predecessor. This replaces it with
-- a unique partial index to close that race at the DB layer, backstopping
-- the app-layer check in cloneGoalWithMeasurables.

DROP INDEX IF EXISTS idx_goals_previous_goal_id;

CREATE UNIQUE INDEX idx_goals_previous_goal_id
  ON goals (previous_goal_id)
  WHERE previous_goal_id IS NOT NULL;
