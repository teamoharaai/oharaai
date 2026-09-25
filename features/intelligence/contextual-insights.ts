export const INSIGHT_CONTEXTS = [
  'home',
  'goal',
  'project_personal',
  'project_team',
  'project_guide',
  'momentum_weekly',
  'momentum_monthly',
  'weekly_recap',
] as const;

export type InsightContext = (typeof INSIGHT_CONTEXTS)[number];

export type InsightFactType =
  | 'goal_momentum_change'
  | 'goal_inactivity'
  | 'goal_deadline_approaching'
  | 'task_completion_rate'
  | 'task_overdue'
  | 'task_due_today'
  | 'task_assignment_distribution'
  | 'milestone_completed'
  | 'milestone_upcoming'
  | 'reflection_count_change'
  | 'note_activity'
  | 'source_activity'
  | 'project_activity_concentration'
  | 'project_goal_comparison'
  | 'momentum_overall_change'
  | 'momentum_dimension_change'
  | 'momentum_monthly_trend'
  | 'team_member_activity'
  | 'team_assignment_completion'
  | 'guide_client_adherence';

export type InsightSubjectType =
  | 'goal'
  | 'project'
  | 'task'
  | 'milestone'
  | 'member'
  | 'momentum'
  | 'reflection'
  | 'note'
  | 'source';

export type InsightFact = {
  id: string;
  type: InsightFactType;
  subjectType: InsightSubjectType;
  subjectId: string;
  subjectName: string;
  timeWindow: 'today' | 'week' | 'month' | 'current';
  currentValue: number | null;
  previousValue: number | null;
  delta: number | null;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
  priorityHint: number;
  authorization: 'authorized' | 'unauthorized';
};

export type ContextualInsight = {
  context: InsightContext;
  subtitle: 'Today' | 'Goal insight' | 'Project insight' | 'Weekly insight' | 'Monthly insight' | 'Weekly recap';
  primary: string;
  secondary: string | null;
  selectedFactIds: string[];
  kind: InsightFactType | 'empty' | 'stable';
};

export type ProjectFactInput = {
  projectId: string;
  goals: Array<{
    id: string;
    title: string;
    momentum: number | null;
    weeklyDelta: number | null;
    latestActivityAt?: string | null;
  }>;
  tasks: Array<{
    timing: 'overdue' | 'today' | 'upcoming' | 'anytime';
    assignedTo?: string | null;
  }>;
  milestones: Array<{ id?: string; title: string; dueDate: Date | null; completedAt: Date | null }>;
  activity: Array<{ label: string; occurredAt: string; origin?: string; actorId?: string | null }>;
  authorizedReflectionCount?: number;
  authorizedNoteCount?: number;
  authorizedSourceCount?: number;
  latestActivityAt: string | null;
  now?: Date;
};

export type GoalFactInput = {
  goalId: string;
  goalTitle: string;
  weeklyMomentumDelta: number | null;
  taskCompletedCount: number;
  taskDueCount: number;
  milestoneCompletedCount: number;
  nextMilestone?: { id?: string; title: string; dueDate: Date } | null;
  deadline?: Date | null;
  latestActivityAt?: string | null;
  authorizedReflectionCount?: number;
  now?: Date;
};

export type MomentumFactInput = {
  currentValue: number | null;
  weeklyChange: number | null;
  dimensions: Array<{ id: string; name: string; currentValue: number; previousValue?: number | null }>;
  history: Array<{ value: number }>;
};

const RANKS: Record<InsightContext, Partial<Record<InsightFactType, number>>> = {
  home: {
    task_due_today: 130,
    task_overdue: 125,
    goal_inactivity: 115,
    goal_momentum_change: 105,
    milestone_upcoming: 95,
    milestone_completed: 85,
  },
  goal: {
    goal_momentum_change: 130,
    task_completion_rate: 120,
    milestone_upcoming: 110,
    milestone_completed: 105,
    goal_deadline_approaching: 100,
    goal_inactivity: 90,
    reflection_count_change: 80,
  },
  project_personal: {
    project_goal_comparison: 140,
    goal_momentum_change: 130,
    task_completion_rate: 115,
    task_overdue: 85,
    goal_inactivity: 105,
    milestone_upcoming: 95,
    milestone_completed: 90,
    reflection_count_change: 75,
    note_activity: 70,
    source_activity: 65,
  },
  project_team: {
    team_assignment_completion: 150,
    project_goal_comparison: 140,
    project_activity_concentration: 130,
    goal_inactivity: 120,
    milestone_upcoming: 110,
    task_overdue: 105,
    team_member_activity: 90,
  },
  project_guide: {
    guide_client_adherence: 150,
    goal_momentum_change: 140,
    task_overdue: 130,
    milestone_upcoming: 120,
    goal_deadline_approaching: 115,
    goal_inactivity: 105,
    reflection_count_change: 85,
    milestone_completed: 80,
  },
  momentum_weekly: {
    momentum_dimension_change: 150,
    momentum_overall_change: 140,
    goal_momentum_change: 100,
  },
  momentum_monthly: {
    momentum_monthly_trend: 150,
    momentum_dimension_change: 130,
    momentum_overall_change: 100,
  },
  weekly_recap: {
    goal_momentum_change: 140,
    task_completion_rate: 130,
    milestone_completed: 120,
    reflection_count_change: 110,
    project_goal_comparison: 100,
    momentum_overall_change: 90,
  },
};

const SUBTITLES: Record<InsightContext, ContextualInsight['subtitle']> = {
  home: 'Today',
  goal: 'Goal insight',
  project_personal: 'Project insight',
  project_team: 'Project insight',
  project_guide: 'Project insight',
  momentum_weekly: 'Weekly insight',
  momentum_monthly: 'Monthly insight',
  weekly_recap: 'Weekly recap',
};

const EMPTY_COPY: Record<InsightContext, string> = {
  home: 'Nothing needs immediate attention right now.',
  goal: 'Momentum will become more informative as you log progress.',
  project_personal: 'No major Project trends yet. Activity across your Goals will appear here over time.',
  project_team: 'No major Project trends yet. Team activity will appear here over time.',
  project_guide: 'No major Project trends yet. Authorized client progress will appear here over time.',
  momentum_weekly: 'Momentum stayed relatively steady this week.',
  momentum_monthly: 'A monthly Momentum pattern will appear after more weekly history is available.',
  weekly_recap: 'Your weekly story will become clearer as meaningful activity is recorded.',
};

function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

function direction(delta: number): 'increased' | 'decreased' | 'stayed steady' {
  if (Math.abs(delta) < 0.5) return 'stayed steady';
  return delta > 0 ? 'increased' : 'decreased';
}

function subjectGoal(fact: InsightFact): string {
  return fact.subjectName || 'This Goal';
}

function renderFact(fact: InsightFact, context: InsightContext): string {
  const value = fact.currentValue ?? 0;
  const delta = fact.delta ?? 0;
  const magnitude = Math.abs(rounded(delta));
  const days = Number(fact.metadata.days ?? 0);
  const completed = Number(fact.metadata.completed ?? value);
  const due = Number(fact.metadata.due ?? 0);

  switch (fact.type) {
    case 'goal_momentum_change':
      if (context === 'goal') return Math.abs(delta) < 0.5 ? 'Goal Momentum stayed steady this week.' : `Goal Momentum ${direction(delta)} by ${magnitude} points this week.`;
      if (context === 'project_personal') return `${subjectGoal(fact)} had the strongest Momentum ${delta >= 0 ? 'improvement' : 'change'} in this Project (${delta >= 0 ? '+' : '−'}${magnitude}).`;
      if (context === 'project_team') return `${subjectGoal(fact)} recorded the largest Goal Momentum change this week (${delta >= 0 ? '+' : '−'}${magnitude}).`;
      if (context === 'project_guide') return `${subjectGoal(fact)} Goal Momentum ${direction(delta)} by ${magnitude} points this week.`;
      if (context === 'momentum_weekly') return `Goal progress contributed to this week’s Momentum ${delta >= 0 ? 'increase' : 'change'}.`;
      if (context === 'weekly_recap') return `Biggest mover: ${subjectGoal(fact)} ${delta >= 0 ? '↑' : '↓'} ${magnitude}.`;
      return `${subjectGoal(fact)} Momentum ${direction(delta)} by ${magnitude} points this week.`;
    case 'goal_inactivity':
      return context === 'project_personal'
        ? `${subjectGoal(fact)} has had no recorded activity for ${days} days.`
        : `No authorized activity has been recorded for ${days} days.`;
    case 'goal_deadline_approaching':
      return days === 0 ? 'The Goal deadline is today.' : `The Goal deadline is in ${days} ${days === 1 ? 'day' : 'days'}.`;
    case 'task_completion_rate':
      return due > 0 ? `${completed} of ${due} scheduled Tasks were completed this week.` : `${completed} ${completed === 1 ? 'Task was' : 'Tasks were'} completed this week.`;
    case 'task_overdue':
      return `${value} assigned ${value === 1 ? 'Task is' : 'Tasks are'} overdue.`;
    case 'task_due_today':
      return `${value} ${value === 1 ? 'Task needs' : 'Tasks need'} attention today.`;
    case 'task_assignment_distribution':
      return `${value} active ${value === 1 ? 'Task is' : 'Tasks are'} assigned across this Project.`;
    case 'milestone_completed':
      return `${fact.subjectName} was completed this week.`;
    case 'milestone_upcoming':
      return `${fact.subjectName} is ${days === 0 ? 'due today' : `due in ${days} ${days === 1 ? 'day' : 'days'}`}.`;
    case 'reflection_count_change':
      return `${value} shared ${value === 1 ? 'Reflection was' : 'Reflections were'} added this week.`;
    case 'note_activity':
      return `${value} shared ${value === 1 ? 'Note is' : 'Notes are'} available in this Project.`;
    case 'source_activity':
      return `${value} shared ${value === 1 ? 'source is' : 'sources are'} available in this Project.`;
    case 'project_goal_comparison':
      return `${value} of ${Number(fact.metadata.total ?? value)} active ${Number(fact.metadata.total ?? value) === 1 ? 'Goal gained' : 'Goals gained'} Momentum this week.`;
    case 'project_activity_concentration':
      return `Most recorded work came from ${fact.subjectName} this week.`;
    case 'momentum_overall_change':
      return Math.abs(delta) < 0.5 ? 'Momentum stayed relatively steady this week.' : `Momentum ${direction(delta)} by ${magnitude} points this week.`;
    case 'momentum_dimension_change':
      return `${fact.subjectName} ${direction(delta)} most this week (${delta >= 0 ? '+' : '−'}${magnitude}).`;
    case 'momentum_monthly_trend': {
      const improvingWeeks = Number(fact.metadata.improvingWeeks ?? 0);
      const totalWeeks = Number(fact.metadata.totalWeeks ?? 0);
      return `Momentum trended upward in ${improvingWeeks} of the last ${totalWeeks} weeks.`;
    }
    case 'team_member_activity':
      return `${value} Project ${value === 1 ? 'contribution was' : 'contributions were'} recorded this week.`;
    case 'team_assignment_completion':
      return `${value} assigned ${value === 1 ? 'Task was' : 'Tasks were'} completed this week.`;
    case 'guide_client_adherence':
      return due > 0 ? `${fact.subjectName} completed ${completed} of ${due} scheduled Tasks this week.` : `${fact.subjectName} completed ${completed} scheduled ${completed === 1 ? 'Task' : 'Tasks'} this week.`;
  }
}

function repetitionGroup(type: InsightFactType): string {
  if (type.startsWith('goal_momentum') || type.startsWith('momentum_') || type === 'project_goal_comparison') return 'momentum';
  if (type.startsWith('task_') || type === 'team_assignment_completion' || type === 'guide_client_adherence') return 'tasks';
  if (type.startsWith('milestone_') || type === 'goal_deadline_approaching') return 'dates';
  if (type === 'reflection_count_change' || type === 'note_activity' || type === 'source_activity') return 'content';
  return type;
}

export function selectContextualInsight(facts: readonly InsightFact[], context: InsightContext): ContextualInsight {
  const ranks = RANKS[context];
  const eligible = facts
    .filter((fact) => fact.authorization === 'authorized' && ranks[fact.type] !== undefined)
    .map((fact) => ({ fact, score: (ranks[fact.type] ?? 0) + fact.priorityHint }))
    .sort((a, b) => b.score - a.score || a.fact.id.localeCompare(b.fact.id));

  const primary = eligible[0]?.fact;
  if (!primary) {
    return {
      context,
      subtitle: SUBTITLES[context],
      primary: EMPTY_COPY[context],
      secondary: null,
      selectedFactIds: [],
      kind: context === 'momentum_weekly' ? 'stable' : 'empty',
    };
  }

  const primaryGroup = repetitionGroup(primary.type);
  const secondary = eligible.find(({ fact }) => fact.id !== primary.id && repetitionGroup(fact.type) !== primaryGroup)?.fact ?? null;
  return {
    context,
    subtitle: SUBTITLES[context],
    primary: renderFact(primary, context),
    secondary: secondary ? renderFact(secondary, context) : null,
    selectedFactIds: secondary ? [primary.id, secondary.id] : [primary.id],
    kind: primary.type,
  };
}

function fact(input: Omit<InsightFact, 'authorization'> & { authorization?: InsightFact['authorization'] }): InsightFact {
  return { ...input, authorization: input.authorization ?? 'authorized' };
}

export function buildProjectInsightFacts(input: ProjectFactInput): InsightFact[] {
  const now = input.now ?? new Date();
  const facts: InsightFact[] = [];
  const momentumGoals = input.goals.filter((goal) => goal.weeklyDelta !== null);
  const strongest = [...momentumGoals].sort((a, b) => Math.abs(b.weeklyDelta!) - Math.abs(a.weeklyDelta!))[0];
  if (strongest) {
    facts.push(fact({ id: `goal-momentum-${strongest.id}`, type: 'goal_momentum_change', subjectType: 'goal', subjectId: strongest.id, subjectName: strongest.title, timeWindow: 'week', currentValue: strongest.momentum, previousValue: strongest.momentum === null ? null : strongest.momentum - strongest.weeklyDelta!, delta: strongest.weeklyDelta, metadata: {}, priorityHint: Math.min(20, Math.abs(strongest.weeklyDelta!)) }));
  }
  if (momentumGoals.length) {
    const improving = momentumGoals.filter((goal) => goal.weeklyDelta! > 0).length;
    facts.push(fact({ id: `project-comparison-${input.projectId}`, type: 'project_goal_comparison', subjectType: 'project', subjectId: input.projectId, subjectName: 'Project', timeWindow: 'week', currentValue: improving, previousValue: null, delta: null, metadata: { total: momentumGoals.length }, priorityHint: improving ? 4 : 0 }));
  }

  const overdue = input.tasks.filter((task) => task.timing === 'overdue').length;
  const dueToday = input.tasks.filter((task) => task.timing === 'today').length;
  const assigned = input.tasks.filter((task) => task.assignedTo).length;
  if (overdue) facts.push(fact({ id: `tasks-overdue-${input.projectId}`, type: 'task_overdue', subjectType: 'project', subjectId: input.projectId, subjectName: 'Project', timeWindow: 'current', currentValue: overdue, previousValue: null, delta: null, metadata: {}, priorityHint: overdue }));
  if (dueToday) facts.push(fact({ id: `tasks-today-${input.projectId}`, type: 'task_due_today', subjectType: 'project', subjectId: input.projectId, subjectName: 'Project', timeWindow: 'today', currentValue: dueToday, previousValue: null, delta: null, metadata: {}, priorityHint: dueToday }));
  if (assigned) facts.push(fact({ id: `tasks-assigned-${input.projectId}`, type: 'task_assignment_distribution', subjectType: 'project', subjectId: input.projectId, subjectName: 'Project', timeWindow: 'current', currentValue: assigned, previousValue: null, delta: null, metadata: {}, priorityHint: 0 }));

  const weekAgo = now.getTime() - 7 * 86_400_000;
  const recent = input.activity.filter((item) => new Date(item.occurredAt).getTime() >= weekAgo);
  const completedTasks = recent.filter((item) => item.label.startsWith('Task completed')).length;
  if (completedTasks) {
    facts.push(fact({ id: `team-completions-${input.projectId}`, type: 'team_assignment_completion', subjectType: 'project', subjectId: input.projectId, subjectName: 'Project', timeWindow: 'week', currentValue: completedTasks, previousValue: null, delta: null, metadata: {}, priorityHint: completedTasks }));
    facts.push(fact({ id: `guide-adherence-${input.projectId}`, type: 'guide_client_adherence', subjectType: 'member', subjectId: input.projectId, subjectName: 'The client', timeWindow: 'week', currentValue: completedTasks, previousValue: null, delta: null, metadata: { completed: completedTasks, due: completedTasks + overdue }, priorityHint: completedTasks }));
  }
  const actorActivity = recent.filter((item) => item.actorId).length;
  if (actorActivity) facts.push(fact({ id: `member-activity-${input.projectId}`, type: 'team_member_activity', subjectType: 'project', subjectId: input.projectId, subjectName: 'Project', timeWindow: 'week', currentValue: actorActivity, previousValue: null, delta: null, metadata: {}, priorityHint: 0 }));

  const originCounts = new Map<string, number>();
  for (const item of recent) if (item.origin) originCounts.set(item.origin, (originCounts.get(item.origin) ?? 0) + 1);
  const concentrated = [...originCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (concentrated && recent.length > 1) facts.push(fact({ id: `activity-concentration-${input.projectId}`, type: 'project_activity_concentration', subjectType: 'project', subjectId: input.projectId, subjectName: concentrated[0].replace(/^From:\s*/, ''), timeWindow: 'week', currentValue: concentrated[1], previousValue: null, delta: null, metadata: { total: recent.length }, priorityHint: concentrated[1] }));

  const upcoming = input.milestones
    .filter((milestone) => !milestone.completedAt && milestone.dueDate)
    .map((milestone) => ({ ...milestone, days: daysBetween(now, milestone.dueDate!) }))
    .filter((milestone) => milestone.days >= 0 && milestone.days <= 7)
    .sort((a, b) => a.days - b.days || a.title.localeCompare(b.title))[0];
  if (upcoming) facts.push(fact({ id: `milestone-upcoming-${upcoming.id ?? upcoming.title}`, type: 'milestone_upcoming', subjectType: 'milestone', subjectId: upcoming.id ?? upcoming.title, subjectName: upcoming.title, timeWindow: 'current', currentValue: null, previousValue: null, delta: null, metadata: { days: upcoming.days }, priorityHint: 7 - upcoming.days }));

  if (input.latestActivityAt) {
    const inactiveDays = Math.max(0, Math.floor((now.getTime() - new Date(input.latestActivityAt).getTime()) / 86_400_000));
    if (inactiveDays >= 5) facts.push(fact({ id: `inactivity-${input.projectId}`, type: 'goal_inactivity', subjectType: 'project', subjectId: input.projectId, subjectName: 'Project', timeWindow: 'current', currentValue: inactiveDays, previousValue: null, delta: null, metadata: { days: inactiveDays }, priorityHint: Math.min(inactiveDays, 20) }));
  }

  if (input.authorizedReflectionCount) facts.push(fact({ id: `reflections-${input.projectId}`, type: 'reflection_count_change', subjectType: 'reflection', subjectId: input.projectId, subjectName: 'Reflections', timeWindow: 'week', currentValue: input.authorizedReflectionCount, previousValue: null, delta: null, metadata: {}, priorityHint: 0 }));
  if (input.authorizedNoteCount) facts.push(fact({ id: `notes-${input.projectId}`, type: 'note_activity', subjectType: 'note', subjectId: input.projectId, subjectName: 'Notes', timeWindow: 'current', currentValue: input.authorizedNoteCount, previousValue: null, delta: null, metadata: {}, priorityHint: 0 }));
  if (input.authorizedSourceCount) facts.push(fact({ id: `sources-${input.projectId}`, type: 'source_activity', subjectType: 'source', subjectId: input.projectId, subjectName: 'Sources', timeWindow: 'current', currentValue: input.authorizedSourceCount, previousValue: null, delta: null, metadata: {}, priorityHint: 0 }));
  return facts;
}

export function buildGoalInsightFacts(input: GoalFactInput): InsightFact[] {
  const now = input.now ?? new Date();
  const facts: InsightFact[] = [];
  if (input.weeklyMomentumDelta !== null) facts.push(fact({ id: `goal-momentum-${input.goalId}`, type: 'goal_momentum_change', subjectType: 'goal', subjectId: input.goalId, subjectName: input.goalTitle, timeWindow: 'week', currentValue: null, previousValue: null, delta: input.weeklyMomentumDelta, metadata: {}, priorityHint: Math.abs(input.weeklyMomentumDelta) }));
  if (input.taskDueCount || input.taskCompletedCount) facts.push(fact({ id: `goal-tasks-${input.goalId}`, type: 'task_completion_rate', subjectType: 'goal', subjectId: input.goalId, subjectName: input.goalTitle, timeWindow: 'week', currentValue: input.taskCompletedCount, previousValue: null, delta: null, metadata: { completed: input.taskCompletedCount, due: input.taskDueCount }, priorityHint: input.taskDueCount }));
  if (input.nextMilestone) {
    const days = daysBetween(now, input.nextMilestone.dueDate);
    if (days >= 0 && days <= 14) facts.push(fact({ id: `goal-milestone-${input.nextMilestone.id ?? input.nextMilestone.title}`, type: 'milestone_upcoming', subjectType: 'milestone', subjectId: input.nextMilestone.id ?? input.nextMilestone.title, subjectName: input.nextMilestone.title, timeWindow: 'current', currentValue: null, previousValue: null, delta: null, metadata: { days }, priorityHint: 14 - days }));
  }
  if (input.milestoneCompletedCount) facts.push(fact({ id: `goal-milestones-complete-${input.goalId}`, type: 'milestone_completed', subjectType: 'milestone', subjectId: input.goalId, subjectName: `${input.milestoneCompletedCount} ${input.milestoneCompletedCount === 1 ? 'Milestone' : 'Milestones'}`, timeWindow: 'week', currentValue: input.milestoneCompletedCount, previousValue: null, delta: null, metadata: {}, priorityHint: input.milestoneCompletedCount }));
  if (input.deadline) {
    const days = daysBetween(now, input.deadline);
    if (days >= 0 && days <= 14) facts.push(fact({ id: `goal-deadline-${input.goalId}`, type: 'goal_deadline_approaching', subjectType: 'goal', subjectId: input.goalId, subjectName: input.goalTitle, timeWindow: 'current', currentValue: null, previousValue: null, delta: null, metadata: { days }, priorityHint: 14 - days }));
  }
  if (input.latestActivityAt) {
    const days = Math.max(0, Math.floor((now.getTime() - new Date(input.latestActivityAt).getTime()) / 86_400_000));
    if (days >= 5) facts.push(fact({ id: `goal-inactivity-${input.goalId}`, type: 'goal_inactivity', subjectType: 'goal', subjectId: input.goalId, subjectName: input.goalTitle, timeWindow: 'current', currentValue: days, previousValue: null, delta: null, metadata: { days }, priorityHint: days }));
  }
  if (input.authorizedReflectionCount) facts.push(fact({ id: `goal-reflections-${input.goalId}`, type: 'reflection_count_change', subjectType: 'reflection', subjectId: input.goalId, subjectName: 'Reflections', timeWindow: 'week', currentValue: input.authorizedReflectionCount, previousValue: null, delta: null, metadata: {}, priorityHint: 0 }));
  return facts;
}

export function buildMomentumInsightFacts(input: MomentumFactInput): InsightFact[] {
  const facts: InsightFact[] = [];
  if (input.currentValue !== null && input.weeklyChange !== null) facts.push(fact({ id: 'momentum-overall-week', type: 'momentum_overall_change', subjectType: 'momentum', subjectId: 'ohara', subjectName: 'Momentum', timeWindow: 'week', currentValue: input.currentValue, previousValue: input.currentValue - input.weeklyChange, delta: input.weeklyChange, metadata: {}, priorityHint: Math.abs(input.weeklyChange) }));
  const changedDimensions = input.dimensions
    .filter((item) => item.previousValue !== undefined && item.previousValue !== null)
    .map((item) => ({ ...item, delta: item.currentValue - item.previousValue! }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name));
  const dimension = changedDimensions[0];
  if (dimension) facts.push(fact({ id: `momentum-dimension-${dimension.id}`, type: 'momentum_dimension_change', subjectType: 'momentum', subjectId: dimension.id, subjectName: dimension.name, timeWindow: 'week', currentValue: dimension.currentValue, previousValue: dimension.previousValue!, delta: dimension.delta, metadata: {}, priorityHint: Math.abs(dimension.delta) }));
  if (input.history.length >= 3) {
    let improvingWeeks = 0;
    for (let index = 1; index < input.history.length; index += 1) if (input.history[index].value > input.history[index - 1].value) improvingWeeks += 1;
    facts.push(fact({ id: 'momentum-monthly-trend', type: 'momentum_monthly_trend', subjectType: 'momentum', subjectId: 'ohara', subjectName: 'Momentum', timeWindow: 'month', currentValue: input.history.at(-1)?.value ?? null, previousValue: input.history[0]?.value ?? null, delta: (input.history.at(-1)?.value ?? 0) - (input.history[0]?.value ?? 0), metadata: { improvingWeeks, totalWeeks: input.history.length - 1 }, priorityHint: improvingWeeks }));
  }
  return facts;
}
