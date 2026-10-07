import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshots = resolve(process.cwd(), 'docs/ui-checkpoints/home-circles-calendar-foundation');
mkdirSync(screenshots, { recursive: true });

const viewerId = '11111111-1111-4111-8111-111111111111';
const friendId = '22222222-2222-4222-8222-222222222222';
const now = '2026-10-07T14:00:00.000Z';
const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ aud: 'authenticated', exp: 1893456000, role: 'authenticated', sub: viewerId })).toString('base64url')}.preview`;
const user = { id: viewerId, email: 'arthur@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: { display_name: 'Arthur' }, created_at: now };
const project = { id: 'project-1', user_id: viewerId, title: 'Winter Arc', description: 'Build strength and consistency.', status: 'active', mode: 'personal', start_date: null, end_date: null, period_key: null, created_at: now, updated_at: now };
const goal = {
  id: 'goal-1', user_id: viewerId, title: 'Ego Lifting & Mobility', description: 'Train with intention.', category: 'Health & Fitness', smart_data: {}, color_theme: 'forest', deadline: '2026-10-30T00:00:00.000Z', completed_at: null, archived_at: null, expired_at: null, target_frequency: { times: 4, period: 'week' }, visibility: 'private', progress: 42, status: 'active', ai_generated: false, project_id: project.id, project_lead_id: null, previous_goal_id: null, prior_phase_summary: null, reflection: null, reflected_at: null, created_at: '2026-09-01T14:00:00.000Z', updated_at: now,
  milestones: [
    { id: 'milestone-1', goal_id: 'goal-1', user_id: viewerId, title: 'Complete first training block', description: null, due_date: '2026-10-09', completed_at: null, sort_order: 0, is_ai_suggested: false, kind: 'achievement', parent_id: null, target_count: null, photo_url: null, created_at: now, updated_at: now, responsible_user_id: null, assigned_by: null, created_by: viewerId },
  ],
  trackers: [],
};
const calendarItems = [
  { id: 'task-occurrence:overdue', sourceType: 'task_occurrence', sourceId: 'overdue', title: 'Mobility reset', contextTitle: goal.title, startAt: '2026-10-06', endAt: null, allDay: true, timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: goal.id, projectId: project.id, projectTitle: project.title, taskId: 'task-overdue', occurrenceId: 'overdue', isOharaItem: true, isExternal: false, status: 'pending', visibility: 'private' },
  { id: 'task-occurrence:one', sourceType: 'task_occurrence', sourceId: 'one', title: 'Pull Day', contextTitle: goal.title, startAt: '2026-10-07T13:00:00.000Z', endAt: null, allDay: false, timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: goal.id, projectId: project.id, projectTitle: project.title, taskId: 'task-1', occurrenceId: 'one', isOharaItem: true, isExternal: false, status: 'pending', visibility: 'private' },
  { id: 'task-occurrence:two', sourceType: 'task_occurrence', sourceId: 'two', title: 'Project review', contextTitle: 'Ship the public beta', startAt: '2026-10-07T19:00:00.000Z', endAt: null, allDay: false, timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: 'goal-2', projectId: 'project-2', projectTitle: 'OHARA Launch', taskId: 'task-2', occurrenceId: 'two', isOharaItem: true, isExternal: false, status: 'pending', visibility: 'project' },
  { id: 'milestone:one', sourceType: 'milestone', sourceId: 'milestone-1', title: 'Complete first training block', contextTitle: goal.title, startAt: '2026-10-09', endAt: null, allDay: true, timezone: 'America/New_York', provider: 'ohara', calendarId: null, goalId: goal.id, projectId: project.id, projectTitle: project.title, taskId: null, occurrenceId: null, isOharaItem: true, isExternal: false, status: 'active', visibility: 'private' },
];
const maya = { id: friendId, username: 'maya', displayName: 'Maya Chen', avatarUrl: null };
const post = { id: 'post-1', authorId: friendId, postKind: 'milestone', body: 'Finished the first training block today. The steady work is starting to feel natural.', imagePath: null, link: { kind: 'milestone', refId: 'milestone-friend', title: 'First training block', description: 'A month of consistent work.', category: 'Health & Fitness' }, createdAt: '2026-10-07T12:00:00.000Z', author: maya, encouragementCount: 4, commentCount: 2, encouragedByMe: false, savedByMe: false };
const sharedGoal = { id: 'shared-goal', ownerId: friendId, title: 'Run a Comfortable 10K', category: 'Health & Fitness', status: 'active', access: 'invited', milestones: [{ title: 'Build base mileage', done: true }, { title: 'Complete 8K', done: false }], weeklyTask: { done: 3, target: 4 }, owner: maya };

async function installPreview(page: Page, theme: 'light' | 'dark' = 'light') {
  const session = { access_token: token, refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user };
  await page.addInitScript(({ value, appearance }) => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) return JSON.stringify(value);
      return originalGetItem.call(this, key);
    };
    localStorage.setItem('sb-calendar-preview-auth-token', JSON.stringify(value));
    localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: appearance }, version: 5 }));
    for (const patch of ['journal-prelaunch-redesign', 'notes-prelaunch-library', 'projects-v1-1-execution', 'projects-v1-0', 'goals-v2-3-1', 'vault-v2-3', 'notes-v1-1', 'momentum-v1-1']) localStorage.setItem(`ohara:release:${patch}:seen`, 'seen');
  }, { value: session, appearance: theme });

  await page.route(/https?:\/\/[^/]+\/(?:auth|rest)\/v1\/.*/, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.includes('/auth/v1/user')) return json(user);
    if (url.pathname.endsWith('/goals')) return json([goal]);
    if (url.pathname.endsWith('/projects')) return json([project]);
    return json([]);
  });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const ok = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data, error: null }) });
    const json = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    if (path === '/api/calendar/items') return json({ data: calendarItems });
    if (path === '/api/home/summary') return json({ reflectionTimestamps: {}, weeklyTaskCounts: { 'goal-1': { done: 2, target: 4 } } });
    if (path === '/api/momentum') return json({ data: { weeklyStreak: 3, score: 72, goals: [] } });
    if (path === '/api/profile') return ok({ display_name: 'Arthur', username: 'arthur', avatar_url: null });
    if (path === '/api/circles/feed') return ok({ posts: [post] });
    if (path === '/api/circles/shared-with-me') return ok({ goals: [sharedGoal] });
    if (path === '/api/circles/friends/public-goals') return ok({ goals: [] });
    if (path === '/api/circles/invites' || path === '/api/circles/invites/sent') return ok({ invites: [] });
    if (path === '/api/circles/public-goal') return ok({ goal: null });
    if (path === '/api/circles/linkable') return ok({ goals: [{ kind: 'goal', id: goal.id, title: goal.title, category: goal.category, description: goal.description }], milestones: [], reflections: [] });
    if (path === '/api/friends') return ok({ friends: [maya] });
    if (path === '/api/task-occurrences/one' || path === '/api/task-occurrences/two' || path === '/api/task-occurrences/overdue') return json({ data: { status: 'completed' } });
    return json({ data: [], entries: [], items: [] });
  });
}

async function open(page: Page, path: string, width = 1440, height = 1000) {
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 240_000 });
  await page.waitForTimeout(800);
}

test('captures Home, Circles, and Calendar foundation states', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  await installPreview(page);
  await open(page, '/dashboard');
  await expect(page.getByText("Today's Focus", { exact: true })).toBeVisible();
  await expect(page.getByText('Pull Day', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('All updates', { exact: true })).toHaveCount(0);
  expect(requests.filter((path) => path.startsWith('/api/circles'))).toEqual([]);
  expect(requests.filter((path) => path === '/api/calendar/items')).toHaveLength(1);
  await page.screenshot({ path: `${screenshots}/01-home-desktop-light.png`, fullPage: true });
  await page.screenshot({ path: `${screenshots}/03-home-with-today-calendar.png`, fullPage: true });
  await page.screenshot({ path: `${screenshots}/04-home-with-no-external-calendar.png`, fullPage: true });

  await page.getByRole('button', { name: 'Open account and Circles' }).click();
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  await page.getByRole('button', { name: 'Close account panel' }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshots}/02-home-desktop-dark.png`, fullPage: true });

  await open(page, '/circles');
  await expect(page.getByRole('heading', { name: 'Circles', exact: true })).toBeVisible();
  await expect(page.getByText(/Finished the first training block today/)).toBeVisible();
  expect(requests.filter((path) => path === '/api/circles/feed').length).toBeGreaterThan(0);
  await page.screenshot({ path: `${screenshots}/05-circles-feed.png`, fullPage: true });

  await open(page, '/calendar');
  await expect(page.getByRole('heading', { name: 'Calendar', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Month', exact: true })).toBeVisible();
  await expect(page.getByText('Pull Day', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/08-calendar-desktop-month.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Week', exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshots}/07-calendar-desktop-week.png`, fullPage: true });
  await page.screenshot({ path: `${screenshots}/09-calendar-ohara-items-only.png`, fullPage: true });
  await page.screenshot({ path: `${screenshots}/14-global-header-calendar-icon.png`, fullPage: true });

  await open(page, '/calendar?providerPreview=connected');
  await expect(page.getByText('Apple Calendar connected', { exact: true })).toBeVisible();
  await expect(page.getByText('Dentist', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/10-calendar-connected-provider-state.png`, fullPage: true });

  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${screenshots}/06-calendar-desktop-today.png`, fullPage: true });

  await open(page, '/dashboard', 390, 844);
  await page.screenshot({ path: `${screenshots}/11-iphone-home.png`, fullPage: true });
  await open(page, '/calendar', 390, 844);
  await page.screenshot({ path: `${screenshots}/12-iphone-calendar.png`, fullPage: true });
  await page.screenshot({ path: `${screenshots}/13-calendar-permission-connect-state.png`, fullPage: true });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
