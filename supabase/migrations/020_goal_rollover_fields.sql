-- Migration 020: Goal Rollover Fields
-- Link continuation goals to their predecessors and reserve prior-phase summaries.

ALTER TABLE goals
  ADD COLUMN previous_goal_id uuid NULL REFERENCES goals(id) ON DELETE SET NULL,
  ADD COLUMN prior_phase_summary jsonb NULL;

CREATE INDEX idx_goals_previous_goal_id ON goals
  (previous_goal_id) WHERE previous_goal_id IS NOT NULL;
