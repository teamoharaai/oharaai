import type { Page } from '@playwright/test';
import type { MomentumHomeSummary } from '../../features/momentum/types';
import type { FriendsSnapshot } from '../../features/friends/types';

// Synthetic accounts and data only; all network reads/writes are intercepted.
const viewerId = '11111111-1111-4111-8111-111111111111';
const friendId = '22222222-2222-4222-8222-222222222222';
const now = '2026-10-07T14:00:00.000Z';
const previewToday = '2026-10-08T14:00:00.000Z';
const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ aud: 'authenticated', exp: 1893456000, role: 'authenticated', sub: viewerId })).toString('base64url')}.preview`;
const user = { id: viewerId, email: 'arthur@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: { display_name: 'Arthur' }, created_at: now };
const project = { id: 'project-1', user_id: viewerId, title: 'Winter Arc', description: 'Build strength and consistency.', status: 'active', mode: 'personal', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: now };
const sharedProject = { id: 'project-shared', user_id: friendId, title: 'OHARA Launch', description: 'Ship the prelaunch together.', status: 'active', mode: 'team', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: now };
export const goal = {
  id: 'goal-1', user_id: viewerId, title: 'Ego Lifting & Mobility', description: 'Train with intention.', category: 'Health & Fitness', smart_data: {}, color_theme: 'forest', deadline: '2026-10-30T00:00:00.000Z', completed_at: null, archived_at: null, expired_at: null, target_frequency: { times: 4, period: 'week' }, visibility: 'private', progress: 42, status: 'active', ai_generated: false, project_id: project.id, project_lead_id: null, previous_goal_id: null, prior_phase_summary: null, reflection: null, reflected_at: null, created_at: '2026-09-01T14:00:00.000Z', updated_at: now,
  milestones: [
    { id: 'milestone-1', goal_id: 'goal-1', user_id: viewerId, title: 'Complete first training block', description: null, due_date: '2026-10-09', completed_at: null, sort_order: 0, is_ai_suggested: false, kind: 'achievement', parent_id: null, target_count: null, photo_url: null, created_at: now, updated_at: now, responsible_user_id: null, assigned_by: null, created_by: viewerId },
  ],
  trackers: [],
};
const calendarItems = [
  { id: 'task-occurrence:overdue', sourceType: 'task_occurrence', sourceId: 'overdue', title: 'Mobility reset', contextTitle: goal.title, startAt: '2026-10-06', endAt: null, allDay: true, timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: goal.id, projectId: project.id, projectTitle: project.title, taskId: 'task-overdue', occurrenceId: 'overdue', isOharaItem: true, isExternal: false, status: 'pending', visibility: 'private' },
  { id: 'task-occurrence:one', sourceType: 'task_occurrence', sourceId: 'one', title: 'Pull Day', contextTitle: goal.title, startAt: '2026-10-08T13:00:00.000Z', endAt: null, allDay: false, timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: goal.id, projectId: project.id, projectTitle: project.title, taskId: 'task-1', occurrenceId: 'one', isOharaItem: true, isExternal: false, status: 'pending', visibility: 'private' },
  { id: 'task-occurrence:two', sourceType: 'task_occurrence', sourceId: 'two', title: 'Project review', contextTitle: 'Ship the public beta', startAt: '2026-10-07T19:00:00.000Z', endAt: null, allDay: false, timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: 'goal-2', projectId: 'project-2', projectTitle: 'OHARA Launch', taskId: 'task-2', occurrenceId: 'two', isOharaItem: true, isExternal: false, status: 'pending', visibility: 'project' },
  { id: 'milestone:one', sourceType: 'milestone', sourceId: 'milestone-1', title: 'Complete first training block', contextTitle: goal.title, startAt: '2026-10-09', endAt: null, allDay: true, timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: goal.id, projectId: project.id, projectTitle: project.title, taskId: null, occurrenceId: null, isOharaItem: true, isExternal: false, status: 'active', visibility: 'private' },
];
const maya = { id: friendId, username: 'maya', displayName: 'Maya Chen', avatarUrl: null };
const post = { id: 'post-1', authorId: friendId, postKind: 'milestone', body: 'Finished the first training block today. The steady work is starting to feel natural.', imagePath: null, link: { kind: 'milestone', refId: 'milestone-friend', title: 'First training block', description: 'A month of consistent work.', category: 'Health & Fitness' }, createdAt: '2026-10-07T12:00:00.000Z', author: maya, encouragementCount: 4, commentCount: 2, encouragedByMe: false, savedByMe: false };
const sharedGoal = { id: 'shared-goal', ownerId: friendId, title: 'Run a Comfortable 10K', category: 'Health & Fitness', status: 'active', access: 'invited', milestones: [{ title: 'Build base mileage', done: true }, { title: 'Complete 8K', done: false }], weeklyTask: { done: 3, target: 4 }, owner: maya };

export type HomePreviewMode = 'populated' | 'empty' | 'error' | 'loading' | 'many';

export async function installPreview(page: Page, theme: 'light' | 'dark' = 'light', home?: HomePreviewMode) {
  let releaseLoading = () => {};
  const loadingGate = new Promise<void>((resolve) => { releaseLoading = resolve; });
  await page.clock.setFixedTime(new Date(previewToday));
  const session = { access_token: token, refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user };
  await page.addInitScript(({ value, appearance }) => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) return JSON.stringify(value);
      return originalGetItem.call(this, key);
    };
    localStorage.setItem('sb-calendar-preview-auth-token', JSON.stringify(value));
    localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: appearance }, version: 5 }));
    for (const patch of ['journal-prelaunch-redesign', 'notes-prelaunch-library', 'projects-v1-1-execution', 'projects-v1-0', 'goals-v2-3-1', 'vault-v2-3', 'notes-v1-1', 'momentum-v1-1']) {
      localStorage.setItem(`ohara:release:${patch}:seen`, 'seen');
      sessionStorage.setItem(`ohara:release:${patch}:seen`, 'seen');
    }
  }, { value: session, appearance: theme });

  await page.route(/https?:\/\/[^/]+\/(?:auth|rest)\/v1\/.*/, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.includes('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/goals') && url.searchParams.get('status') === 'eq.archived') return json([]);
    if (url.pathname.endsWith('/goals')) {
      if (home === 'loading') await loadingGate;
      if (home === 'empty') return json([]);
      if (home === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Preview goal read unavailable' }) });
    }
    if (url.pathname.endsWith('/goals')) return json([goal, {
      ...goal,
      id: 'goal-shared-project',
      project_id: sharedProject.id,
      title: 'Ship the public beta',
      user_id: friendId,
      milestones: goal.milestones.map((milestone) => ({ ...milestone, id: 'milestone-shared-project', goal_id: 'goal-shared-project', title: 'Prepare launch review' })),
    }, ...(home ? ['archived', 'expired', 'complete'].map((status) => ({ ...goal, id: `goal-${status}`, status, title: `${status} Goal`, milestones: goal.milestones.map((milestone) => ({ ...milestone, id: `milestone-${status}`, title: `Hidden ${status} milestone` })) })) : [])]);
    if (url.pathname.endsWith('/projects')) return json([project, sharedProject]);
    if (url.pathname.endsWith('/project_members')) return json([
      { project_id: project.id },
      { project_id: sharedProject.id },
      { project_id: sharedProject.id },
      { project_id: sharedProject.id },
    ]);
    if (url.pathname.endsWith('/vaults') || url.pathname.endsWith('/vault_items')) return json([]);
    return json([]);
  });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const ok = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data, error: null }) });
    const json = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    if (path === '/api/calendar/items' || path === '/api/momentum') {
      if (home === 'loading') await loadingGate;
      if (home === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Preview data unavailable' }) });
    }
    if (path === '/api/notes/library') return json({ version: 'notes-library.v1', viewerId, folders: [], notes: [], sources: [] });
    if (path === '/api/journal/library') return json({ version: 'journal-library.v1', viewerId, entries: [], projects: [], goals: [] });
    if (path === '/api/calendar/items') return json({ data: home === 'empty' ? [] : home === 'many' ? [...calendarItems, ...Array.from({ length: 6 }, (_, index) => ({ ...calendarItems[1], id: `extra-${index}`, title: `Scheduled action ${index + 1}` }))] : calendarItems });
    if (path === '/api/momentum' && home === 'empty') return json({ data: {
      algorithmVersion: 'momentum-v1.1', asOf: now, components: { portfolioProgress: null, milestoneVelocity: null, growthCadence: null, sustainedGrowth: null, portfolioCoverage: null },
      currentValue: null, displayedValue: null, goals: [], history: [], periodState: 'provisional', reasons: [], status: 'unavailable', tasksCompletedThisWeek: 0,
      trendLabels: [], trendPoints: [], trend: 'unavailable', weekEnd: '2026-10-11', weekStart: '2026-10-05', weeklyChange: null, weeklyStreak: 0,
    } satisfies MomentumHomeSummary });
    if (path === '/api/home/summary') return json({ reflectionTimestamps: {}, weeklyTaskCounts: { 'goal-1': { done: 2, target: 4 } } });
    if (path === '/api/momentum') return json({ data: {
      algorithmVersion: 'momentum-v1.1', asOf: now,
      components: { portfolioProgress: 72, milestoneVelocity: null, growthCadence: 72, sustainedGrowth: null, portfolioCoverage: 72 },
      currentValue: 72, displayedValue: 72,
      goals: [{
        goalId: goal.id, algorithmVersion: 'momentum-v1.1', asOf: now,
        currentValue: 68, displayedValue: 68, weeklyChange: 5, status: 'active',
        history: [], reasons: [], periodState: 'provisional',
        difficulty: { band: 'D2', compositeScore: 50, version: 'goal-difficulty-v1' },
        pillars: { consistency: 68, progress: 68, reflection: 68, initiative: 68 },
        weekEnd: '2026-10-11', weekStart: '2026-10-05',
      }], history: home ? [
        { value: 54, start: '2026-08-31', end: '2026-09-06' },
        { value: 61, start: '2026-09-07', end: '2026-09-13' },
        { value: 58, start: '2026-09-14', end: '2026-09-20' },
        { value: 65, start: '2026-09-21', end: '2026-09-27' },
        { value: 68, start: '2026-09-28', end: '2026-10-04' },
      ].map((point) => ({ algorithmVersion: 'momentum-v1.1', periodState: 'closed' as const, periodStart: point.start, periodEnd: point.end, revision: 1, previousValue: point.value, value: point.value })) : [],
      periodState: 'provisional', reasons: [], status: 'active', tasksCompletedThisWeek: 2,
      trendLabels: [], trendPoints: [], trend: 'up', weekEnd: '2026-10-11', weekStart: '2026-10-05',
      weeklyChange: 4, weeklyStreak: 3,
    } satisfies MomentumHomeSummary });
    if (path === '/api/profile') return ok({ display_name: 'Arthur', username: 'arthur', avatar_url: null, intelligence_enabled: true });
    if (path === '/api/circles/feed') return ok({ posts: [post] });
    if (path === '/api/circles/shared-with-me') return ok({ goals: [sharedGoal] });
    if (path === '/api/circles/friends/public-goals') return ok({ goals: [] });
    if (path === '/api/circles/invites' || path === '/api/circles/invites/sent') return ok({ invites: [] });
    if (path === '/api/circles/public-goal') return ok({ goal: null });
    if (path === '/api/circles/linkable') return ok({ goals: [{ kind: 'goal', id: goal.id, title: goal.title, category: goal.category, description: goal.description }], milestones: [], reflections: [] });
    if (path === '/api/friends') return ok({
      friends: [{ id: friendId, username: 'maya', display_name: 'Maya Chen', avatar_url: null }],
      friend_count: 1, incoming_requests: [], sent_requests: [],
    } satisfies FriendsSnapshot);
    if (path === '/api/task-occurrences/one' || path === '/api/task-occurrences/two' || path === '/api/task-occurrences/overdue') return json({ data: { status: 'completed' } });
    return json({ data: [], entries: [], items: [] });
  });
  return releaseLoading;
}
