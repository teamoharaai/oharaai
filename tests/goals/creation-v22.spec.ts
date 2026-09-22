import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`V2.2 manual creation ${theme} ${width}`, async ({ page }) => {
    const user = { id: '11111111-1111-4111-8111-111111111111', email: 'preview@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
    const session = { access_token: 'preview-token', refresh_token: 'preview-refresh', token_type: 'bearer', expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, user };
    let creation: Record<string, unknown> | null = null;
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(({ session, theme }) => {
      localStorage.setItem('sb-goals-preview-auth-token', JSON.stringify(session));
      localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: theme }, version: 0 }));
    }, { session, theme });
    await page.route('https://goals-preview.invalid/**', async (route) => {
      const url = new URL(route.request().url());
      const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (route.request().method() !== 'GET') writes.push(url.pathname);
      if (url.pathname.includes('/auth/v1/user')) return json(user);
      if (url.pathname.endsWith('/profiles')) return json({ id: user.id, display_name: 'Preview', username: 'preview' });
      if (url.pathname.endsWith('/goals') && url.searchParams.has('previous_goal_id')) return json([]);
      if (url.pathname.endsWith('/milestones') && route.request().method() === 'POST') return json({
        ...route.request().postDataJSON(), id: '44444444-4444-4444-8444-444444444444', completed_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      if (url.pathname.endsWith('/goals') && creation) return json({ id: '22222222-2222-4222-8222-222222222222', user_id: user.id, ...creation, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), smart_data: {}, milestones: [], trackers: [] });
      return json([]);
    });
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (route.request().method() !== 'GET') writes.push(path);
      if (path.startsWith('/api/circles/')) return json({ ok: true, data: { posts: [], goals: [], invites: [], friends: [], reflections: [], milestones: [], publicGoal: null }, error: null });
      if (path === '/api/goals') {
        creation = route.request().postDataJSON();
        return json({ ok: true, data: { goalId: '22222222-2222-4222-8222-222222222222', warning: null, error: null } });
      }
      if (path === '/api/tasks' && route.request().method() === 'POST') return json({ data: { id: 'task-draft', ...route.request().postDataJSON(), schedules: [], occurrences: [] } });
      if (path === '/api/friends') return json({ ok: true, data: { friends: [{ id: '33333333-3333-4333-8333-333333333333', display_name: 'Preview Friend', username: 'friend', avatar_url: null }], incoming_requests: [], sent_requests: [], friend_count: 1 } });
      return json({ data: [], entries: [], items: [], ok: true });
    });
    await page.goto('http://localhost:4181/goals/create');
    await expect(page.getByRole('textbox', { name: 'Goal title', exact: true })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(4);
    await page.getByRole('textbox', { name: 'Goal title', exact: true }).fill('Learn a language with regular reading and practice');
    await page.getByRole('button', { name: 'View title idea', exact: true }).click();
    await expect(page.getByText('OHARA suggestion', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Keep mine', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Goal title', exact: true })).toHaveValue('Learn a language with regular reading and practice');
    await page.getByRole('radio', { name: 'Learning & Creativity' }).click();
    await page.getByRole('button', { name: 'Continue →' }).click();
    await expect(page.getByText(/Expected rhythm/)).toBeVisible();
    await page.getByRole('button', { name: 'Continue →' }).click();
    await expect(page.getByText('No milestones yet.', { exact: true })).toBeVisible();
    await expect(page.getByText('No Tasks yet.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '✦ View Suggestions' }).first().click();
    await expect(page.getByText('Nothing is added until you choose and save it.')).toBeVisible();
    expect(writes).toEqual([]);
    await page.getByRole('button', { name: '+ Add', exact: true }).first().click();
    await expect(page.getByRole('textbox', { name: 'Milestone name', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel milestone changes' }).click();
    await page.getByRole('button', { name: '+ Add Task', exact: true }).click();
    await page.getByRole('textbox', { name: 'Add a to-do', exact: true }).fill('Read a short passage');
    await page.getByRole('button', { name: 'Save to-do', exact: true }).click();
    await expect(page.getByText('Read a short passage', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '+ Add Milestone', exact: true }).click();
    await page.getByRole('textbox', { name: 'Milestone name', exact: true }).fill('Read my first chapter');
    await page.getByRole('button', { name: 'Add Milestone', exact: true }).click();
    await expect(page.getByText('Read my first chapter', { exact: true })).toBeVisible();
    expect(writes).toEqual([]);
    const keepPlan = width === 1440;
    await page.getByRole('button', { name: keepPlan ? 'Continue →' : 'Skip for now', exact: true }).click();
    await expect(page.getByText(keepPlan ? /1 Tasks · 1 Milestones/ : /0 Tasks · 0 Milestones/)).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Private/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('radio', { name: /^Circles/ }).click();
    await expect(page.getByRole('checkbox', { name: /Preview Friend/ })).toBeVisible();
    await page.getByRole('checkbox', { name: /Preview Friend/ }).click();
    await page.getByRole('radio', { name: /^Public/ }).click();
    await expect(page.getByText(/not public on the web/)).toBeVisible();
    await page.getByRole('radio', { name: /^Private/ }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByText('Close', { exact: true })).toBeHidden();
    await page.getByRole('heading', { name: 'New Goal', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/ohara-v22-${theme}-${width}-review.png`, fullPage: true });
    await page.getByRole('button', { name: 'Create Goal', exact: true }).click();
    await expect(page.getByText('Your Goal is ready.', { exact: true })).toBeVisible();
    expect(creation).toMatchObject({ category: 'Learning & Creativity', visibility: 'private', milestones: [], trackers: [], target_frequency: { period: 'week', times: 4 } });
    expect(writes.filter((path) => path === '/api/tasks')).toHaveLength(keepPlan ? 1 : 0);
    expect(writes.filter((path) => path.endsWith('/milestones'))).toHaveLength(keepPlan ? 1 : 0);
    expect(errors).toEqual([]);
  });
}
