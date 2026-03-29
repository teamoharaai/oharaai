export interface Task {
  id: string;
  title: string;
  type: string;
  priority: number;
}

export async function getDailyTasks(_userId: string): Promise<Task[]> {
  // TODO: implement daily task recommendation
  return [];
}
