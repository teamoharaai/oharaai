import type { ProductCategory } from '../../lib/goals/product-categories.ts';

/** Draft-only contextual prompts. Opening suggestions never creates records. */
export function planSuggestions(title: string, category: ProductCategory, deadline: string, reason: string) {
  const goal = title.trim();
  if (!goal) return { tasks: [], milestones: [] };
  const context = `${goal} ${reason}`.toLowerCase();
  const date = deadline ? ` by ${deadline}` : '';
  if (/\b(meditat|mindful|stress)/.test(context)) return {
    tasks: ['Practice a short meditation session', 'Reflect on what helped your focus', 'Make time for a quiet break'],
    milestones: ['Complete your first meditation session', 'Find a meditation routine that works for you', `Review progress toward ${goal}${date}`],
  };
  if (/\b(run|5k|10k|marathon)\b/.test(context)) return {
    tasks: ['Complete an easy run', 'Plan your next training session', 'Make time for mobility and recovery'],
    milestones: ['Complete a comfortable practice run', 'Complete a longer continuous run', `Reach ${goal}${date}`],
  };
  if (/\b(read|book|study|learn|language)\b/.test(context)) return {
    tasks: [`Spend focused time on ${goal}`, 'Review what you learned', 'Plan the next reading or practice session'],
    milestones: [`Choose the first material for ${goal}`, 'Complete the first section or practice unit', `Review what you learned${date}`],
  };
  const action = category === 'Work & Money' ? 'work session' : category === 'Learning & Creativity' ? 'practice session' : 'focused session';
  return {
    tasks: [`Plan the next step for ${goal}`, `Set aside a ${action} for ${goal}`, `Review progress on ${goal}`],
    milestones: [`Define a first achievable result for ${goal}`, `Complete a first meaningful step toward ${goal}`, `Review the outcome of ${goal}${date}`],
  };
}
