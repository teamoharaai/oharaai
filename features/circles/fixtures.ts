/**
 * PROTOTYPE FIXTURES — realistic mock data for the Circles prototype.
 * No backend exists for public goals, goal invitations, posts, encouragements,
 * comments, or saves yet.
 */
import type {
  CirclePerson,
  CirclesPost,
  GoalInvite,
  MyGoal,
  MyReflection,
  SharedGoal,
} from './types';

export const ME: CirclePerson = {
  id: 'me',
  displayName: 'You',
  firstName: 'You',
  avatarUrl: null,
  activity: 'Active now',
  hasNewPost: false,
  following: true,
  focus: '',
};

export const PEOPLE: CirclePerson[] = [
  { id: 'maya', displayName: 'Maya Chen', firstName: 'Maya', avatarUrl: null, activity: 'Active today', hasNewPost: false, following: true, focus: 'Training for her first 5K this fall' },
  { id: 'arthur', displayName: 'Arthur Dubois', firstName: 'Arthur', avatarUrl: null, activity: 'New post', hasNewPost: true, following: true, focus: 'Reading more widely, one book a month' },
  { id: 'lucas', displayName: 'Lucas Moretti', firstName: 'Lucas', avatarUrl: null, activity: 'Active today', hasNewPost: false, following: true, focus: 'Building a design portfolio to change careers' },
  { id: 'priya', displayName: 'Priya Sharma', firstName: 'Priya', avatarUrl: null, activity: 'Active 2 days ago', hasNewPost: false, following: true, focus: 'Saving for a sabbatical next spring' },
  { id: 'elena', displayName: 'Elena Park', firstName: 'Elena', avatarUrl: null, activity: 'New post', hasNewPost: true, following: true, focus: 'Learning conversational Japanese' },
  { id: 'sam', displayName: 'Sam Okafor', firstName: 'Sam', avatarUrl: null, activity: 'Active this week', hasNewPost: false, following: true, focus: 'Calling family every Sunday' },
];

/** Each friend's single public Goal (optional). Every friend can view these. */
export const PUBLIC_GOALS: SharedGoal[] = [
  {
    id: 'g-5k', ownerId: 'maya', title: 'Run a 5K', category: 'health', status: 'in_progress', access: 'public',
    why: 'To prove to myself that slow and steady still gets somewhere.',
    milestones: [
      { title: 'Run 1 mile without stopping', done: true },
      { title: 'Run 3K', done: true },
      { title: 'Register for the October race', done: false },
      { title: 'Finish the 5K', done: false },
    ],
    weeklyTask: { label: 'runs this week', done: 3, target: 5 },
  },
  {
    id: 'g-books', ownerId: 'arthur', title: 'Read 12 books', category: 'education', status: 'complete', access: 'public',
    why: 'A year of new perspectives.',
    milestones: [
      { title: 'Finish book 3', done: true },
      { title: 'Finish book 6', done: true },
      { title: 'Finish book 12', done: true },
    ],
  },
];

/** Goals the viewer was explicitly invited to and already accepted. */
export const ACCEPTED_SHARED_GOALS: SharedGoal[] = [
  {
    id: 'g-portfolio', ownerId: 'lucas', title: 'Build a portfolio', category: 'career', status: 'in_progress', access: 'invited',
    why: 'So my work can speak for the career I want next.',
    milestones: [
      { title: 'Pick three case studies', done: true },
      { title: 'Write the first case study', done: true },
      { title: 'Design the site', done: false },
      { title: 'Share with five mentors', done: false },
    ],
    weeklyTask: { label: 'focused sessions this week', done: 2, target: 4 },
  },
  {
    id: 'g-sabbatical', ownerId: 'priya', title: 'Save for a sabbatical', category: 'finance', status: 'in_progress', access: 'invited',
    why: 'Three months to rest, travel, and think.',
    milestones: [
      { title: 'Open a dedicated account', done: true },
      { title: 'Reach 50%', done: true },
      { title: 'Reach 100%', done: false },
    ],
    weeklyTask: { label: 'transfers this week', done: 1, target: 1 },
  },
];

/** Pending invitations shown in Requests. */
export const PENDING_GOAL_INVITES: GoalInvite[] = [
  {
    id: 'inv-japanese',
    sentLabel: '1h ago',
    goal: {
      id: 'g-japanese', ownerId: 'elena', title: 'Hold a conversation in Japanese', category: 'growth', status: 'not_started', access: 'invited',
      why: 'To talk with my grandmother in her first language.',
      milestones: [],
      weeklyTask: { label: 'practice sessions this week', done: 0, target: 3 },
    },
  },
  {
    id: 'inv-sunday',
    sentLabel: 'Yesterday',
    goal: {
      id: 'g-sunday', ownerId: 'sam', title: 'Call family every Sunday', category: 'relationships', status: 'in_progress', access: 'invited',
      why: 'Distance shouldn’t mean drifting apart.',
      milestones: [
        { title: 'Set a recurring reminder', done: true },
        { title: 'Four Sundays in a row', done: false },
      ],
      weeklyTask: { label: 'calls this week', done: 1, target: 1 },
    },
  },
];

export const MY_GOALS: MyGoal[] = [
  {
    id: 'mine-sleep', title: 'Sleep before 11pm', category: 'health',
    description: 'Protecting mornings by ending the day on time.',
    milestones: [
      { title: 'Two weeks of screens off at 10:30', done: true },
      { title: 'A full month before 11', done: false },
    ],
  },
  {
    id: 'mine-guitar', title: 'Learn five songs on guitar', category: 'creative',
    description: 'Playing for fun again, one song at a time.',
    milestones: [
      { title: 'First song end to end', done: true },
      { title: 'Play for a friend', done: false },
    ],
  },
  {
    id: 'mine-family', title: 'Call my parents weekly', category: 'relationships',
    description: 'A standing call, even when the week is busy.',
    milestones: [],
  },
];

export const MY_REFLECTIONS: MyReflection[] = [
  { id: 'ref-rest', title: 'Rest is part of the plan', description: 'Noticing that slower weeks still move things forward.' },
  { id: 'ref-mornings', title: 'Quieter mornings', description: 'What changed once evenings ended earlier.' },
];

export const INITIAL_POSTS: CirclesPost[] = [
  {
    id: 'p-maya', authorId: 'maya', kind: 'reflection', createdLabel: '2h ago',
    body: 'Some days are harder than others, but showing up still counts. Grateful for a slow but steady week of progress — a reminder that consistency builds the life I want.',
    image: null,
    attachment: {
      kind: 'goal', id: 'g-5k', title: 'Run a 5K', category: 'health',
      description: 'Training for my first race this fall.',
    },
    encouragements: 12, encouragedByMe: false, savedByMe: false,
    comments: [
      { id: 'c1', authorId: 'priya', body: 'Slow and steady is still moving. Proud of you.', createdLabel: '1h ago' },
      { id: 'c2', authorId: 'lucas', body: 'Three runs in a tough week is a lot. Rest counts too.', createdLabel: '48m ago' },
    ],
  },
  {
    id: 'p-lucas', authorId: 'lucas', kind: 'milestone', createdLabel: 'Yesterday',
    body: 'Hit a big milestone today — halfway through my portfolio. It feels surreal to see everything starting to come together.',
    image: { tone: 'career', caption: 'Morning walk before a long writing session' },
    attachment: {
      kind: 'milestone', id: 'm-case-study', title: 'Write the first case study', category: 'career',
      goalTitle: 'Build a portfolio',
    },
    encouragements: 18, encouragedByMe: true, savedByMe: false,
    comments: [
      { id: 'c3', authorId: 'maya', body: 'Halfway! Can’t wait to read the case study.', createdLabel: '20h ago' },
    ],
  },
  {
    id: 'p-arthur', authorId: 'arthur', kind: 'goal_complete', createdLabel: '2 days ago',
    body: 'Finished my goal to read 12 books this year. So many lessons and a deeper appreciation for how much there is to learn. Already planning the next list.',
    image: null,
    attachment: {
      kind: 'goal_complete', id: 'g-books', goalTitle: 'Read 12 books', category: 'education',
      reflection: 'A year of new perspectives.', completedLabel: 'Completed Sep 15',
    },
    encouragements: 24, encouragedByMe: false, savedByMe: true,
    comments: [],
  },
  {
    id: 'p-priya', authorId: 'priya', kind: 'reflection', createdLabel: '3 days ago',
    body: 'Skipped a dinner out this week and didn’t feel like I was missing anything. Picturing the quiet mornings the sabbatical will buy me makes it easy.',
    image: null,
    attachment: {
      kind: 'reflection', id: 'ref-priya-enough', title: 'What “enough” feels like',
      description: 'On wanting less and noticing more.',
    },
    encouragements: 9, encouragedByMe: false, savedByMe: false,
    comments: [],
  },
];

export function personById(id: string): CirclePerson {
  if (id === ME.id) return ME;
  return PEOPLE.find((person) => person.id === id) ?? ME;
}
