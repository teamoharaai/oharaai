-- Create action_logs table for tracking discrete action steps tied to goals.

CREATE TABLE IF NOT EXISTS action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_text text NOT NULL,
  status text CHECK (status IN ('pending', 'complete', 'skipped')) DEFAULT 'pending',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_action_logs_goal_created ON action_logs(goal_id, created_at DESC);
CREATE INDEX idx_action_logs_user_status ON action_logs(user_id, status);

-- RLS
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action logs"
  ON action_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own action logs"
  ON action_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own action logs"
  ON action_logs FOR UPDATE
  USING (user_id = auth.uid());
