/**
 * TEST-ONLY FIXTURES for Circles.
 *
 * These sample the real server DTO shapes (`lib/db/circles-core.ts`) so unit
 * tests (Phase 6) can exercise selectors, mappers, and components without a
 * network. They are intentionally NOT imported by any production path — the app
 * gets its data from `features/circles/services/circles-service.ts`. Do not add
 * production importers; grep `features/circles`/`app` for `fixtures` must stay
 * empty of runtime code.
 */
import type {
  CircleGoalSummary,
  CirclesAuthor,
  CirclesFeedPost,
  IncomingGoalInvite,
  LinkableItems,
  PostComment,
  SavedPost,
  SentGoalInvite,
} from './types';

export const AUTHORS: Record<string, CirclesAuthor> = {
  me: { id: 'me', username: 'you', displayName: 'You', avatarUrl: null },
  maya: { id: 'maya', username: 'maya', displayName: 'Maya Chen', avatarUrl: null },
  lucas: { id: 'lucas', username: 'lucas', displayName: 'Lucas Moretti', avatarUrl: null },
  elena: { id: 'elena', username: 'elena', displayName: 'Elena Park', avatarUrl: null },
};

export const FEED_POSTS: CirclesFeedPost[] = [
  {
    id: 'p-maya',
    authorId: 'maya',
    postKind: 'reflection',
    body: 'Slow but steady week of progress — consistency builds the life I want.',
    imagePath: null,
    link: { kind: 'goal', refId: 'g-5k', title: 'Run a 5K', description: 'Training for my first race this fall.', category: 'health' },
    createdAt: '2026-09-17T10:00:00.000Z',
    author: AUTHORS.maya,
    encouragementCount: 12,
    commentCount: 2,
    encouragedByMe: false,
    savedByMe: false,
  },
  {
    id: 'p-lucas',
    authorId: 'lucas',
    postKind: 'milestone',
    body: 'Halfway through my portfolio. Everything is starting to come together.',
    imagePath: null,
    link: { kind: 'milestone', refId: 'm-case-study', title: 'Write the first case study', description: null, category: 'career' },
    createdAt: '2026-09-16T09:00:00.000Z',
    author: AUTHORS.lucas,
    encouragementCount: 18,
    commentCount: 1,
    encouragedByMe: true,
    savedByMe: false,
  },
];

export const COMMENTS: Record<string, PostComment[]> = {
  'p-maya': [
    { id: 'c1', postId: 'p-maya', authorId: 'lucas', body: 'Rest counts too.', createdAt: '2026-09-17T11:00:00.000Z', author: AUTHORS.lucas },
  ],
};

export const SHARED_WITH_ME: CircleGoalSummary[] = [
  {
    id: 'g-portfolio',
    ownerId: 'lucas',
    title: 'Build a portfolio',
    category: 'career',
    status: 'active',
    access: 'invited',
    milestones: [
      { title: 'Pick three case studies', done: true },
      { title: 'Write the first case study', done: true },
      { title: 'Design the site', done: false },
    ],
    weeklyTask: { done: 2, target: 4 },
    owner: AUTHORS.lucas,
  },
];

export const FRIENDS_PUBLIC_GOALS: CircleGoalSummary[] = [
  {
    id: 'g-5k',
    ownerId: 'maya',
    title: 'Run a 5K',
    category: 'health',
    status: 'active',
    access: 'public',
    milestones: [
      { title: 'Run 1 mile without stopping', done: true },
      { title: 'Finish the 5K', done: false },
    ],
    weeklyTask: { done: 3, target: 5 },
    owner: AUTHORS.maya,
  },
];

export const INCOMING_INVITES: IncomingGoalInvite[] = [
  {
    inviteId: 'inv-japanese',
    createdAt: '2026-09-17T08:00:00.000Z',
    goal: {
      id: 'g-japanese',
      ownerId: 'elena',
      title: 'Hold a conversation in Japanese',
      category: 'growth',
      status: 'discovered',
      access: 'invited',
      milestones: [],
      weeklyTask: { done: 0, target: 3 },
      owner: AUTHORS.elena,
    },
  },
];

export const SENT_INVITES: SentGoalInvite[] = [
  {
    id: 'sent-1',
    goalId: 'g-mine',
    status: 'pending',
    createdAt: '2026-09-17T07:00:00.000Z',
    respondedAt: null,
    invitee: AUTHORS.maya,
  },
];

export const SAVED_POSTS: SavedPost[] = [
  { savedAt: '2026-09-17T12:00:00.000Z', post: FEED_POSTS[1] },
];

export const LINKABLE: LinkableItems = {
  goals: [
    { kind: 'goal', id: 'g-mine', title: 'Sleep before 11pm', category: 'health', description: 'Protecting mornings.' },
  ],
  milestones: [
    { kind: 'milestone', id: 'm-mine', title: 'Two weeks of early nights', category: 'health', goalTitle: 'Sleep before 11pm' },
  ],
  reflections: [
    { kind: 'reflection', id: 'ref-mine', title: 'Quieter mornings', description: 'What changed once evenings ended earlier.' },
  ],
};
