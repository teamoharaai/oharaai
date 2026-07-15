-- Migration 022: Goal Reflection Fields
-- Amendment to Document 2 (rollout_momentum/02_extended_writepath.md, CLOSED):
-- adds a skippable free-text reflection captured directly on the successor
-- goal row at extension time, per Document 4's original locked decision that
-- reflection must be skippable/optional.

ALTER TABLE goals
  ADD COLUMN reflection text NULL,
  ADD COLUMN reflected_at timestamptz NULL;
