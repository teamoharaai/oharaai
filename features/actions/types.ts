export type ActionLogStatus = 'pending' | 'complete' | 'skipped';

export interface ActionLog {
  id: string;
  goal_id: string;
  user_id: string;
  action_text: string;
  status: ActionLogStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}
