import type {
  GoalCreationCategory,
  GoalTrackerFrequency,
  GoalTrackerType,
} from '@/lib/goals/schema';

export type GoalCreationDeadlinePreset = '30' | '60' | '90' | 'custom';

export interface GoalCreationTemplateMilestone {
  id: string;
  title: string;
  week: string;
  why: string;
  suggested: true;
}

export interface GoalCreationTemplateTracker {
  id: string;
  title: string;
  type: GoalTrackerType;
  targetValue: number;
  targetUnit: string;
  frequency: GoalTrackerFrequency;
  baseline?: string;
  baselinePrompt?: boolean;
}

export interface GoalCreationTemplate {
  category: GoalCreationCategory;
  label: string;
  icon: string;
  description: string;
  daysDefault: number;
  deadlineDefault: Exclude<GoalCreationDeadlinePreset, 'custom'>;
  daysNote: string;
  suggestion: string;
  milestones: readonly GoalCreationTemplateMilestone[];
  coreTrackers: readonly GoalCreationTemplateTracker[];
  optionalTrackers: readonly GoalCreationTemplateTracker[];
}

const weekly = 'weekly' satisfies GoalTrackerFrequency;

export const GOAL_CREATION_TEMPLATES = {
  health: {
    category: 'health',
    label: 'Health & Fitness',
    icon: '◐',
    description: 'Physical goals, training, wellness routines',
    daysDefault: 4,
    deadlineDefault: '90',
    daysNote: 'Most Health & Fitness goals work well at 4 days/week.',
    suggestion: 'Run a 5K in under 30 minutes by August 30',
    milestones: [
      {
        id: 'health-m1',
        title: 'Choose and register for a race',
        week: 'Week 1',
        why: 'Committing to a real date makes the goal concrete and creates accountability.',
        suggested: true,
      },
      {
        id: 'health-m2',
        title: 'Run 2K continuously',
        week: 'Week 4',
        why: 'A mid-training benchmark proves your endurance base is building steadily.',
        suggested: true,
      },
      {
        id: 'health-m3',
        title: 'Complete a practice 5K',
        week: 'Week 8',
        why: 'Simulating race conditions builds confidence and reveals last-mile issues.',
        suggested: true,
      },
      {
        id: 'health-m4',
        title: 'Race day',
        week: 'Target date',
        why: 'The finish line — the moment the goal becomes real.',
        suggested: true,
      },
    ],
    coreTrackers: [
      {
        id: 'health-c1',
        title: 'Runs this week',
        type: 'habit',
        targetValue: 3,
        targetUnit: 'runs',
        frequency: weekly,
      },
      {
        id: 'health-c2',
        title: 'Weekly distance',
        type: 'counter',
        targetValue: 10,
        targetUnit: 'km',
        frequency: weekly,
        baseline: '',
        baselinePrompt: true,
      },
      {
        id: 'health-c3',
        title: 'Long run completed',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'run',
        frequency: weekly,
      },
    ],
    optionalTrackers: [
      {
        id: 'health-o1',
        title: 'Mobility stretches',
        type: 'habit',
        targetValue: 3,
        targetUnit: 'sessions',
        frequency: weekly,
      },
      {
        id: 'health-o2',
        title: 'Rest day taken',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'day',
        frequency: weekly,
      },
    ],
  },
  finance: {
    category: 'finance',
    label: 'Finance',
    icon: '$',
    description: 'Saving, budgeting, debt, financial milestones',
    daysDefault: 2,
    deadlineDefault: '90',
    daysNote: 'Most Finance goals need only 1–2 weekly check-ins.',
    suggestion: 'Save $2,000 in 90 days by cutting dining out',
    milestones: [
      {
        id: 'finance-m1',
        title: 'Set up automatic transfer',
        week: 'Week 1',
        why: 'Automating removes willpower from the equation.',
        suggested: true,
      },
      {
        id: 'finance-m2',
        title: 'Reach 25% of target',
        week: 'Week 3',
        why: 'An early proof point that the plan is working.',
        suggested: true,
      },
      {
        id: 'finance-m3',
        title: 'Reach 75% of target',
        week: 'Week 9',
        why: 'The home stretch — momentum matters most here.',
        suggested: true,
      },
      {
        id: 'finance-m4',
        title: 'Full target reached',
        week: 'Target date',
        why: 'Full amount saved and locked in.',
        suggested: true,
      },
    ],
    coreTrackers: [
      {
        id: 'finance-c1',
        title: 'Amount saved this week',
        type: 'counter',
        targetValue: 150,
        targetUnit: '$',
        frequency: weekly,
      },
      {
        id: 'finance-c2',
        title: 'Weekly spending review',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'review',
        frequency: weekly,
      },
      {
        id: 'finance-c3',
        title: 'No-spend days',
        type: 'habit',
        targetValue: 2,
        targetUnit: 'days',
        frequency: weekly,
      },
    ],
    optionalTrackers: [
      {
        id: 'finance-o1',
        title: 'Cash-only day',
        type: 'habit',
        targetValue: 2,
        targetUnit: 'days',
        frequency: weekly,
      },
      {
        id: 'finance-o2',
        title: 'Net worth checked',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'check',
        frequency: weekly,
      },
    ],
  },
  career: {
    category: 'career',
    label: 'Career',
    icon: '↗',
    description: 'Job search, skills, promotion, professional growth',
    daysDefault: 3,
    deadlineDefault: '60',
    daysNote: 'Career goals often work best at 3 focused days/week.',
    suggestion: 'Land a senior PM role at a Series B startup by October',
    milestones: [
      {
        id: 'career-m1',
        title: 'Update portfolio and resume',
        week: 'Week 1',
        why: 'You cannot pitch what you cannot show.',
        suggested: true,
      },
      {
        id: 'career-m2',
        title: 'Reach out to 20 warm contacts',
        week: 'Week 3',
        why: 'Most great opportunities come from your extended network.',
        suggested: true,
      },
      {
        id: 'career-m3',
        title: 'Complete 5 first-round interviews',
        week: 'Week 6',
        why: 'Interview fluency compounds — quantity precedes quality.',
        suggested: true,
      },
      {
        id: 'career-m4',
        title: 'Offer signed',
        week: 'Target date',
        why: 'The outcome that proves the plan worked.',
        suggested: true,
      },
    ],
    coreTrackers: [
      {
        id: 'career-c1',
        title: 'Applications sent',
        type: 'counter',
        targetValue: 5,
        targetUnit: 'apps',
        frequency: weekly,
      },
      {
        id: 'career-c2',
        title: 'Deep-work hours',
        type: 'counter',
        targetValue: 8,
        targetUnit: 'hrs',
        frequency: weekly,
      },
      {
        id: 'career-c3',
        title: 'Network conversations',
        type: 'habit',
        targetValue: 2,
        targetUnit: 'chats',
        frequency: weekly,
      },
    ],
    optionalTrackers: [
      {
        id: 'career-o1',
        title: 'Skill practice session',
        type: 'habit',
        targetValue: 3,
        targetUnit: 'sessions',
        frequency: weekly,
      },
      {
        id: 'career-o2',
        title: 'Interview prep block',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'block',
        frequency: weekly,
      },
    ],
  },
  creative: {
    category: 'creative',
    label: 'Creative',
    icon: '✦',
    description: 'Art, music, writing, building, making things',
    daysDefault: 5,
    deadlineDefault: '90',
    daysNote: 'Creative goals thrive on frequent, shorter sessions.',
    suggestion: 'Write and record a 5-song EP by end of quarter',
    milestones: [
      {
        id: 'creative-m1',
        title: 'Rough drafts of all 5 songs',
        week: 'Week 2',
        why: 'Get raw ideas out before polishing anything.',
        suggested: true,
      },
      {
        id: 'creative-m2',
        title: 'Home demos recorded',
        week: 'Week 5',
        why: 'Hearing your work back reveals what actually needs work.',
        suggested: true,
      },
      {
        id: 'creative-m3',
        title: 'Studio tracking complete',
        week: 'Week 10',
        why: 'The execution phase — book studio time early.',
        suggested: true,
      },
      {
        id: 'creative-m4',
        title: 'Final mixes shipped',
        week: 'Target date',
        why: 'Done is better than perfect. Ship it.',
        suggested: true,
      },
    ],
    coreTrackers: [
      {
        id: 'creative-c1',
        title: 'Studio sessions this week',
        type: 'habit',
        targetValue: 5,
        targetUnit: 'sessions',
        frequency: weekly,
      },
      {
        id: 'creative-c2',
        title: 'Minutes of new material',
        type: 'counter',
        targetValue: 15,
        targetUnit: 'min',
        frequency: weekly,
      },
      {
        id: 'creative-c3',
        title: 'Piece shipped',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'piece',
        frequency: weekly,
      },
    ],
    optionalTrackers: [
      {
        id: 'creative-o1',
        title: 'Reference listening',
        type: 'habit',
        targetValue: 2,
        targetUnit: 'sessions',
        frequency: weekly,
      },
      {
        id: 'creative-o2',
        title: 'Feedback received',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'session',
        frequency: weekly,
      },
    ],
  },
  education: {
    category: 'education',
    label: 'Education',
    icon: '◈',
    description: 'Learning, certifications, reading, study goals',
    daysDefault: 5,
    deadlineDefault: '60',
    daysNote: 'Consistent short study sessions beat rare marathons.',
    suggestion: 'Pass the AWS Solutions Architect exam by Sept 15',
    milestones: [
      {
        id: 'education-m1',
        title: 'Complete foundations module',
        week: 'Week 1',
        why: 'The rest of the material builds on this.',
        suggested: true,
      },
      {
        id: 'education-m2',
        title: 'First practice exam',
        week: 'Week 3',
        why: 'Baseline scoring tells you where the real gaps are.',
        suggested: true,
      },
      {
        id: 'education-m3',
        title: 'Score 80%+ on mock exam',
        week: 'Week 7',
        why: 'A reliable predictor of real-exam readiness.',
        suggested: true,
      },
      {
        id: 'education-m4',
        title: 'Exam scheduled and passed',
        week: 'Target date',
        why: 'The finish line.',
        suggested: true,
      },
    ],
    coreTrackers: [
      {
        id: 'education-c1',
        title: 'Study sessions this week',
        type: 'habit',
        targetValue: 5,
        targetUnit: 'sessions',
        frequency: weekly,
      },
      {
        id: 'education-c2',
        title: 'Practice questions',
        type: 'counter',
        targetValue: 40,
        targetUnit: 'qs',
        frequency: weekly,
      },
      {
        id: 'education-c3',
        title: 'Concept notes written',
        type: 'counter',
        targetValue: 5,
        targetUnit: 'notes',
        frequency: weekly,
      },
    ],
    optionalTrackers: [
      {
        id: 'education-o1',
        title: 'Spaced repetition review',
        type: 'habit',
        targetValue: 5,
        targetUnit: 'reviews',
        frequency: weekly,
      },
      {
        id: 'education-o2',
        title: 'Weekly self-quiz',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'quiz',
        frequency: weekly,
      },
    ],
  },
  relationships: {
    category: 'relationships',
    label: 'Relationships',
    icon: '♡',
    description: 'Friendships, communication, connection',
    daysDefault: 3,
    deadlineDefault: '60',
    daysNote: 'A few intentional touchpoints per week compound quickly.',
    suggestion: 'Deepen 3 close friendships with monthly one-on-ones',
    milestones: [
      {
        id: 'relationships-m1',
        title: 'Identify the 3 people',
        week: 'Week 1',
        why: 'Naming them turns intention into action.',
        suggested: true,
      },
      {
        id: 'relationships-m2',
        title: 'First intentional catch-up with each',
        week: 'Week 3',
        why: 'Momentum starts with the first invitation.',
        suggested: true,
      },
      {
        id: 'relationships-m3',
        title: 'Second round complete',
        week: 'Week 6',
        why: 'Consistency is what builds real closeness.',
        suggested: true,
      },
      {
        id: 'relationships-m4',
        title: 'Reflect and adjust',
        week: 'Target date',
        why: 'Notice what worked; carry it forward.',
        suggested: true,
      },
    ],
    coreTrackers: [
      {
        id: 'relationships-c1',
        title: 'Meaningful check-ins',
        type: 'counter',
        targetValue: 3,
        targetUnit: 'check-ins',
        frequency: weekly,
      },
      {
        id: 'relationships-c2',
        title: 'In-person time',
        type: 'counter',
        targetValue: 2,
        targetUnit: 'hrs',
        frequency: weekly,
      },
      {
        id: 'relationships-c3',
        title: 'Weekly reflection',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'reflection',
        frequency: weekly,
      },
    ],
    optionalTrackers: [
      {
        id: 'relationships-o1',
        title: 'Handwritten note sent',
        type: 'habit',
        targetValue: 1,
        targetUnit: 'note',
        frequency: weekly,
      },
      {
        id: 'relationships-o2',
        title: 'Voice-note reply',
        type: 'habit',
        targetValue: 2,
        targetUnit: 'replies',
        frequency: weekly,
      },
    ],
  },
  growth: {
    category: 'growth',
    label: 'Personal Growth',
    icon: '❋',
    description: 'Habits, mindset, reflection, self-improvement',
    daysDefault: 6,
    deadlineDefault: '60',
    daysNote: 'Personal growth compounds with daily reps.',
    suggestion: 'Establish a 20-minute daily meditation practice',
    milestones: [
      {
        id: 'growth-m1',
        title: 'Set up practice space and time',
        week: 'Week 1',
        why: 'Environment carries the habit when motivation dips.',
        suggested: true,
      },
      {
        id: 'growth-m2',
        title: '14-day streak reached',
        week: 'Week 3',
        why: 'The point where it starts to feel automatic.',
        suggested: true,
      },
      {
        id: 'growth-m3',
        title: 'Extend to 20-minute sessions',
        week: 'Week 5',
        why: 'A deeper practice, once the habit is grooved.',
        suggested: true,
      },
      {
        id: 'growth-m4',
        title: 'Reflect and evolve',
        week: 'Target date',
        why: 'Notice what changed. Decide what is next.',
        suggested: true,
      },
    ],
    coreTrackers: [
      {
        id: 'growth-c1',
        title: 'Meditation sessions',
        type: 'habit',
        targetValue: 6,
        targetUnit: 'sessions',
        frequency: weekly,
      },
      {
        id: 'growth-c2',
        title: 'Journal entries',
        type: 'counter',
        targetValue: 4,
        targetUnit: 'entries',
        frequency: weekly,
      },
      {
        id: 'growth-c3',
        title: 'Digital-free hour',
        type: 'habit',
        targetValue: 5,
        targetUnit: 'hrs',
        frequency: weekly,
      },
    ],
    optionalTrackers: [
      {
        id: 'growth-o1',
        title: 'Nature walk',
        type: 'habit',
        targetValue: 2,
        targetUnit: 'walks',
        frequency: weekly,
      },
      {
        id: 'growth-o2',
        title: 'Mood check-in',
        type: 'habit',
        targetValue: 5,
        targetUnit: 'check-ins',
        frequency: weekly,
      },
    ],
  },
} as const satisfies Record<GoalCreationCategory, GoalCreationTemplate>;

/** Kept as a concise alias for consumers following the prototype naming. */
export const TEMPLATES = GOAL_CREATION_TEMPLATES;

export function getGoalCreationTemplate(
  category: GoalCreationCategory,
): GoalCreationTemplate {
  return GOAL_CREATION_TEMPLATES[category];
}
