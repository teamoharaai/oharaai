import { test, expect } from '@playwright/test';

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'preview@example.test', role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const titles = ['Run a 5K', 'Launch portfolio', 'Read twelve books', 'Restore an old bicycle'];
const goals = titles.map((title, index) => ({
  id: `goal-${index}`, user_id: user.id, title, description: index === 0 ? 'Build a steady running rhythm and enjoy the journey.' : null,
  category: ['Health & Fitness', 'Work & Money', 'Learning & Creativity', 'Life & Relationships'][index], status: 'active', color_theme: 'ocean',
  progress: 20, deadline: '2027-03-01T17:00:00Z', created_at: '2026-08-01T12:00:00Z',
  updated_at: `2026-09-${17 - index}T12:00:00Z`, previous_goal_id: null,
  milestones: index === 0 ? [{ id: 'milestone-1', goal_id: 'goal-0', user_id: user.id, title: 'Run two miles continuously',
    completed_at: null, kind: 'achievement', parent_id: null, target_count: null, photo_url: null,
    due_date: '2027-02-01T12:00:00Z', sort_order: 0, created_at: '2026-08-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z' }] : [],
  trackers: [], goal_notes: [],
}));
const date = '2026-09-17T12:00:00Z';
const task = {
  id: 'task-1', goalId: 'goal-0', title: 'Easy run', status: 'active', completionMode: 'binary',
  milestoneId: null, targetQuantity: null, quantityUnit: null, dueDate: new Date().toLocaleDateString('en-CA'), source: 'user',
  legacyCurrentValue: null, legacyFrequency: null, sortOrder: 0, createdAt: date, updatedAt: date,
  schedules: [], occurrences: [{ id: 'occurrence-1', taskId: 'task-1', occurrenceKey: 'once',
    scheduledLocalDate: new Date().toLocaleDateString('en-CA'), status: 'pending', source: 'user', completedAt: null, createdAt: date, updatedAt: date }],
};

for (const appearance of ['light', 'dark']) {
  test(`Goal workspace ${appearance}: progressive disclosure and responsive layout`, async ({ page }) => {
    const errors: string[] = [];
    let failVaultOnce = false;
    let sharedRequests = 0;
    let failAudienceOnce = true;
    const visibilityWrites: unknown[] = [];
    let noteCreated = false;
    const privateNote = { id: 'private-note-1', vaultId: 'vault-1', createdBy: user.id, itemType: 'note', contentKind: 'sticky_note', title: 'Private training thought', content: 'Owner only', metadata: {}, visibility: 'private', createdAt: date, updatedAt: date };
    const sharedGoals = ['Read the entire Bible', 'Run my first 10K', 'Learn piano', 'Build a garden'].map((title, index) => ({
      id: `shared-${index}`, ownerId: 'friend-1', title, category: 'Life & Relationships', status: 'active', access: 'invited',
      owner: { id: 'friend-1', displayName: 'Justin', username: 'justin', avatarUrl: null },
      milestones: [{ title: 'A shared accomplishment', done: true }], weeklyTask: null,
    }));
    page.on('pageerror', (error) => errors.push(error.message));
    const userSession = {
      access_token: 'preview-token', refresh_token: 'preview-refresh', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user,
    };
    await page.addInitScript(({ session, theme }) => {
      localStorage.setItem('sb-goals-preview-auth-token', JSON.stringify(session));
      localStorage.setItem('ohara-ui-state', JSON.stringify({ state: { themeMode: theme }, version: 0 }));
    }, { session: userSession, theme: appearance });
    await page.route('https://goals-preview.invalid/**', async (route) => {
      const url = new URL(route.request().url());
      const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname.includes('/auth/v1/user')) return json(user);
      if (url.pathname.endsWith('/goals')) {
        if (url.searchParams.has('previous_goal_id')) return json([]);
        if (url.searchParams.has('id')) return json(goals.find((goal) => `eq.${goal.id}` === url.searchParams.get('id')) ?? goals[0]);
        return json(goals);
      }
      if (url.pathname.endsWith('/goal_share_invites')) {
        if (failAudienceOnce) { failAudienceOnce = false; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Audience temporarily unavailable' }) }); }
        return json([]);
      }
      if (url.pathname.endsWith('/rpc/set_goal_visibility_v2')) { visibilityWrites.push(route.request().postDataJSON()); return json(null); }
      if (url.pathname.endsWith('/profiles')) return json({ id: user.id, display_name: 'Preview', username: 'preview' });
      return json([]);
    });
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.startsWith('/api/vaults/') && ['POST', 'PUT'].includes(route.request().method())) {
        noteCreated = true;
        Object.assign(privateNote, route.request().postDataJSON());
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ item: privateNote }) });
      }
      if (path === '/api/circles/shared-with-me') {
        sharedRequests += 1;
        if (sharedRequests === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, data: { goals: sharedGoals }, error: null }) });
      }
      if (path.startsWith('/api/circles/')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true,
        data: { posts: [], goals: [], invites: [], friends: [], reflections: [], milestones: [], publicGoal: null }, error: null }) });
      if (path.startsWith('/api/vaults/') && failVaultOnce) {
        failVaultOnce = false;
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      }
      let body: unknown = { data: [] };
      if (path === '/api/tasks') body = { data: [task] };
      if (path === '/api/entries/library') body = { entries: [{
        id: 'entry-1', entryType: 'note', title: 'Training plan', plainText: 'Private contents should stay hidden',
        createdAt: date, updatedAt: date, completedAt: null, goals: [{ id: 'goal-0' }],
      }] };
      if (path === '/api/goals/activity') body = { items: [
        { id: 'created', kind: 'goal_created', timestamp: date },
        { id: 'task-done', kind: 'task_completed', label: 'Mobility', timestamp: date },
        { id: 'source-added', kind: 'vault_item_added', itemType: 'link', contentKind: 'generic', title: 'Race preparation guide', timestamp: date },
      ] };
      if (path === '/api/goals/activity-window') body = { buckets: Array.from({ length: 70 }, (_, index) => {
        const day = new Date(Date.UTC(2026, 6, 10 + index));
        return { date: day.toISOString().slice(0, 10), isoWeekday: day.getUTCDay() || 7, kinds: [], count: 0,
          byKind: { task_completed: 0, entry_created: 0, milestone_completed: 0 }, isToday: index === 69 };
      }) };
      if (path.startsWith('/api/vaults/')) body = { vault: { id: 'vault-1' }, items: [{
        id: 'source-1', itemType: 'link', contentKind: 'generic', title: 'Race preparation guide', metadata: { url: 'https://example.test' }, createdAt: date,
      }, ...(noteCreated ? [privateNote] : [])] };
      if (path === '/api/momentum') body = { data: { goals: [{
        goalId: 'goal-0', displayedValue: 58, status: 'active', periodState: 'provisional',
        history: [30, 45, 39, 58].map((value, index) => ({ value, periodStart: `2026-09-${String(1 + index * 7).padStart(2, '0')}` })),
        reasons: [{ message: 'Your steady effort is building momentum.' }],
      }] } };
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('http://localhost:4181/goals');
    await expect(page.getByRole('button', { name: 'Select Run a 5K', exact: true })).toBeVisible();
    const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    if (await continueButton.isVisible()) await continueButton.click();
    await expect(page.getByRole('button', { name: 'Open Vault', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveCount(0);
    await expect(page.getByRole('progressbar', { name: 'Elapsed Goal time' })).toBeVisible();
    await page.getByRole('button', { name: 'Manage Goal ▾', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retry visibility', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save visibility', exact: true })).toBeDisabled();
    expect(visibilityWrites).toEqual([]);
    await page.getByRole('button', { name: 'Retry visibility', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save visibility', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete', exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Private/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Save visibility', exact: true }).click();
    await expect.poll(() => visibilityWrites.length).toBe(1);
    expect(visibilityWrites[0]).toEqual({ p_goal_id: 'goal-0', p_visibility: 'private', p_audience: [] });
    await expect(page.getByRole('button', { name: 'Save visibility', exact: true })).toBeEnabled();
    await page.getByText('Close', { exact: true }).click();
    await expect(page.getByText('Close', { exact: true })).toBeHidden();
    const sharedCard = page.getByTestId('goals-shared-preview');
    await expect(sharedCard.getByText("Shared Goals couldn't load.")).toBeVisible();
    await sharedCard.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(sharedCard.getByText('Read the entire Bible', { exact: true })).toBeVisible();
    await expect(sharedCard.getByText('Build a garden', { exact: true })).toHaveCount(0);
    await sharedCard.getByRole('button', { name: /Read the entire Bible, shared by Justin/ }).click();
    await expect(page.getByText('View only', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Related updates', exact: true }).click();
    await expect(page.getByText('View only', { exact: true })).toBeHidden();
    await expect(page.getByText('Shared with You', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Read the entire Bible, shared by Justin/ }).click();
    await expect(page.getByText('View only', { exact: true })).toBeVisible();
    await page.locator('div').filter({ has: page.getByText('View only', { exact: true }) })
      .filter({ has: page.getByText('Close', { exact: true }) }).last().getByText('Close', { exact: true }).click();
    await expect(page.getByText('View only', { exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'Goals', exact: true }).click();
    await expect(page.getByRole('button', { name: /Read the entire Bible, shared by Justin/ })).toBeVisible();
    expect(sharedRequests).toBe(2);
    await expect(page.getByRole('button', { name: 'Complete Easy run' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Roots', exact: true }).locator('svg')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select Restore an old bicycle' })).toHaveCount(0);
    await page.getByRole('button', { name: 'View all Goals →' }).click();
    await expect(page.getByRole('button', { name: 'Select Restore an old bicycle' })).toBeVisible();
    await page.getByRole('button', { name: 'Show recent Goals ↑' }).click();
    await page.screenshot({ path: `/tmp/ohara-goals-v21-${appearance}-desktop.png`, fullPage: true });
    await expect(page.getByRole('button', { name: '+ New Prep', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '+ New Milestone', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Milestone name', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel milestone changes' }).click();
    await page.screenshot({ path: `/tmp/ohara-goals-v21-${appearance}-milestones.png`, fullPage: true });
    await page.getByRole('textbox', { name: 'Add a to-do', exact: true }).fill('Unsaved preview');
    await page.getByRole('textbox', { name: 'Add a to-do', exact: true }).fill('');
    failVaultOnce = true;
    await page.getByRole('button', { name: 'Open Vault', exact: true }).click();
    await expect(page).toHaveURL(/view=vault/);
    await expect(page.getByText("Sources couldn't load.")).toBeVisible();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByText("Sources couldn't load.")).toHaveCount(0);
    await expect(page.getByText('Goal Analytics', { exact: true }).filter({ visible: true })).toHaveCount(0);
    for (const filter of ['All', 'Sticky Notes', 'Notes', 'Reflections', 'Sources']) {
      await expect(page.getByRole('tab', { name: filter, exact: true })).toBeVisible();
    }
    await page.getByRole('tab', { name: 'Notes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open Training plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Race preparation guide' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Sources', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open Race preparation guide' })).toBeVisible();
    await page.getByRole('tab', { name: 'All', exact: true }).click();
    await page.getByRole('button', { name: 'Add to Vault', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add Note', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Reflection', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Source', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add Sticky Note', exact: true }).click();
    await page.getByRole('textbox', { name: 'Note title' }).fill('Private training thought');
    await page.getByTestId('goal-private-notes').getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByTestId('goal-private-notes').getByText('Private training thought')).toBeVisible();
    await page.getByRole('button', { name: 'Actions for Private training thought' }).click();
    await page.getByText('Edit', { exact: true }).click();
    await page.getByRole('textbox', { name: 'Note title' }).fill('Edited private thought');
    await page.getByRole('button', { name: 'Save note', exact: true }).click();
    await expect(page.getByTestId('goal-private-notes').getByText('Edited private thought')).toBeVisible();
    await page.getByRole('tab', { name: 'All', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open Training plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Race preparation guide' })).toBeVisible();
    await expect(page.getByText('Private contents should stay hidden')).toHaveCount(0);
    await page.getByRole('button', { name: 'Open Race preparation guide' }).click();
    await expect(page.getByText('Close', { exact: true })).toBeVisible();
    await page.getByText('Close', { exact: true }).click();
    await expect(page.getByText('Close', { exact: true })).toBeHidden();
    await expect(page.getByText('Source added — Race preparation guide', { exact: true })).toBeVisible();
    await expect(page.getByText('Goal created', { exact: true }).filter({ visible: true })).toHaveCount(0);
    await page.getByText('Recent Vault Activity', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/ohara-goals-v21-${appearance}-vault.png`, fullPage: true });
    await page.reload();
    await expect(page).toHaveURL(/view=vault/);
    await expect(page.getByTestId('goal-vault-workspace')).toBeVisible();
    const continueAfterReload = page.getByRole('button', { name: 'Continue', exact: true });
    if (await continueAfterReload.isVisible()) await continueAfterReload.click();
    await page.getByRole('button', { name: 'Select Launch portfolio', exact: true }).click();
    await expect(page).toHaveURL(/view=overview/);
    await expect(page.getByTestId('goal-vault-workspace').filter({ visible: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Select Run a 5K', exact: true }).click();
    await page.getByRole('button', { name: 'Open Vault', exact: true }).click();
    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('button', { name: 'Back to Overview', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Back to Overview', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Add a to-do', exact: true })).toBeVisible();
      await expect(page.getByTestId('goal-private-notes').filter({ visible: true })).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow).toBe(false);
      await page.screenshot({ path: `/tmp/ohara-goals-v21-${appearance}-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: '+ New Milestone', exact: true }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: `/tmp/ohara-goals-v21-${appearance}-milestones-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Open Vault', exact: true }).click();
      await page.getByRole('button', { name: 'Open Training plan' }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: `/tmp/ohara-goals-v21-${appearance}-vault-${width}.png`, fullPage: true });
    }
    sharedGoals.splice(0);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await expect(page.getByText('Goals shared through Circles will appear here.')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
