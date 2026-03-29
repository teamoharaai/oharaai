export interface DailyTask {
  id: string;
  goalId: string;
  title: string;
  type: 'measurable' | 'reflection' | 'check-in';
  priority: number;
  completed: boolean;
}
