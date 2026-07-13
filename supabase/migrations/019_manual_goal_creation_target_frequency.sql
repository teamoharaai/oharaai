-- Migration 019: Manual Goal Creation — target_frequency
-- Additive only, no backfill. category stays NOT NULL per Decision 8.

ALTER TABLE goals
  ADD COLUMN target_frequency jsonb NULL;
-- { "times": int, "period": "day" | "week" | "month" }
-- NULL = narrative goal, no streak/checkmark logic
-- set  = trackable goal, streak/completion logic applies
