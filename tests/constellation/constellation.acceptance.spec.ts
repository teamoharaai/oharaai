import {
  expect,
  test,
  type Page,
} from '@playwright/test';
import {
  acceptanceEchoOption,
  createSeasonOnlyConstellationGraph,
  installConstellationAcceptanceApi,
} from './acceptance-api.ts';

const consoleIssues = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const issues: string[] = [];
  consoleIssues.set(page, issues);
  page.on('console', (message) => {
    const text = message.text();
    const isConsoleError = message.type() === 'error';
    const isKnownMetroRequireCycle = (
      message.type() === 'warning'
      && /^Require cycle: [^\n]+\n\nRequire cycles are allowed,/m.test(text)
    );
    const isDisallowedWarning = (
      message.type() === 'warning'
      && !isKnownMetroRequireCycle
    );
    if (isConsoleError || isDisallowedWarning) {
      issues.push(`[console.${message.type()}] ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    issues.push(`[pageerror] ${error.message}`);
  });
});

test.afterEach(async ({ page }) => {
  expect(
    consoleIssues.get(page) ?? [],
    'Browser console errors, uncaught page errors, and React warnings must be empty.',
  ).toEqual([]);
});

async function waitForFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function openLiveConstellation(page: Page, path = '/constellation') {
  await page.goto(path);
  await expect(
    page.getByLabel('Constellation graph canvas'),
  ).toBeVisible();
  await waitForFonts(page);
}

async function selectNode(
  page: Page,
  kind: 'goal' | 'reflection',
  label: string,
) {
  const nodeControl = page.getByRole('button', {
    name: `Earned ${kind}: ${label}`,
    exact: true,
  });
  await expect(nodeControl).toHaveCount(1);
  await nodeControl.press('Enter');
}

const conceptStates = [
  {
    concept: '1a-canvas-restrained',
    query: '/?appearance=light&state=canvas',
    readyLabel: 'Constellation graph canvas',
    desktop: { width: 1_180, height: 760 },
  },
  {
    concept: '1b-canvas-atmospheric',
    query: '/?appearance=dark&state=canvas',
    readyLabel: 'Constellation graph canvas',
    desktop: { width: 1_180, height: 760 },
  },
  {
    concept: '1c-goal-inspector',
    query: '/?appearance=light&state=goal',
    readyLabel: 'Goal inspector for Train three times weekly',
    desktop: { width: 1_180, height: 760 },
  },
  {
    concept: '1d-reflection-inspector',
    query: '/?appearance=light&state=reflection',
    readyLabel: 'Reflection inspector for Movement clears the fog',
    desktop: { width: 1_180, height: 760 },
  },
  {
    concept: '1e-empty-state',
    query: '/?appearance=light&state=empty',
    readyLabel: 'Set a goal',
    desktop: { width: 960, height: 640 },
  },
] as const;

const responsiveViewports = [
  { name: 'tablet', viewport: { width: 768, height: 1_024 } },
  { name: 'narrow', viewport: { width: 390, height: 844 } },
] as const;

test.describe('five handoff concepts and responsive architecture', () => {
  for (const concept of conceptStates) {
    test(`${concept.concept} at its canonical handoff desktop size`, async ({
      page,
    }) => {
      await page.setViewportSize(concept.desktop);
      await page.goto(concept.query);
      await expect(page.getByLabel(concept.readyLabel)).toBeVisible();
      await waitForFonts(page);
      await expect(page).toHaveScreenshot(
        `${concept.concept}-desktop.png`,
      );
    });

    for (const responsive of responsiveViewports) {
      test(`${concept.concept} at the ${responsive.name} breakpoint`, async ({
        page,
      }) => {
        await page.setViewportSize(responsive.viewport);
        await page.goto(concept.query);
        await expect(page.getByLabel(concept.readyLabel)).toBeVisible();
        await waitForFonts(page);
        await expect(page).toHaveScreenshot(
          `${concept.concept}-${responsive.name}.png`,
        );
      });
    }
  }
});

test.describe('final architecture interaction contract', () => {
  test('shows the intentional initial loading state before graph data arrives', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page, {
      graphDelayMs: 1_000,
    });
    await page.goto('/constellation');

    await expect(page.getByLabel('Loading Constellation')).toBeVisible();
    await expect(page.getByLabel('Constellation graph canvas')).toBeVisible();
  });

  test('node selection enters in-place Focus mode without route navigation', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page);
    await openLiveConstellation(page);

    await page
      .getByLabel('Visual Constellation graph')
      .getByText('Train three times weekly', { exact: true })
      .click();

    await expect(page).toHaveURL(/\/constellation$/);
    await expect(
      page.getByRole('heading', { name: 'Constellation · Focus' }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Goal inspector for Train three times weekly'),
    ).toBeVisible();
    await expect(
      page.getByText('Recent entries · 5', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Goal inspector for Train three times weekly')
        .getByRole('button', { name: 'Read entry' }),
    ).toHaveCount(3);
    await expect(page.getByText(
      'Focus · Train three times weekly',
      { exact: false },
    )).toBeVisible();

    await page.getByRole('button', { name: 'Close inspector' }).click();

    await expect(page).toHaveURL(/\/constellation$/);
    await expect(
      page.getByRole('heading', { name: 'Constellation', exact: true }),
    ).toBeVisible();
  });

  test('collapses the legend, persists the preference, and expands it again', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page);
    await openLiveConstellation(page);

    const collapse = page.getByRole('button', {
      name: 'Collapse Constellation legend',
    });
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await collapse.click();
    await expect(
      page.getByText('Goal planet', { exact: true }),
    ).toHaveCount(0);

    await page.reload();
    await expect(page.getByLabel('Constellation graph canvas')).toBeVisible();
    const expand = page.getByRole('button', {
      name: 'Expand Constellation legend',
    });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expand.click();
    await expect(
      page.getByText('Goal planet', { exact: true }),
    ).toBeVisible();
  });

  test('dragging a goal carries its BRT moon, persists, and can be reset', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page);
    await openLiveConstellation(page);

    const goal = page.locator(
      '[data-constellation-node="node:renderer-goal-train"]',
    );
    const bud = page.locator(
      '[data-constellation-node="brt:renderer-goal-train-source:bud"]',
    );
    const initialGoal = await goal.boundingBox();
    const initialBud = await bud.boundingBox();
    expect(initialGoal).not.toBeNull();
    expect(initialBud).not.toBeNull();
    if (!initialGoal || !initialBud) return;

    const saved = page.waitForResponse((response) => (
      new URL(response.url()).pathname === '/api/constellation/layout'
      && response.request().method() === 'PATCH'
    ));
    await page.mouse.move(
      initialGoal.x + initialGoal.width / 2,
      initialGoal.y + initialGoal.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      initialGoal.x + initialGoal.width / 2 + 72,
      initialGoal.y + initialGoal.height / 2 + 36,
      { steps: 6 },
    );
    await page.mouse.up();
    await saved;

    const movedGoal = await goal.boundingBox();
    const movedBud = await bud.boundingBox();
    expect(movedGoal).not.toBeNull();
    expect(movedBud).not.toBeNull();
    if (!movedGoal || !movedBud) return;
    expect(movedGoal.x - initialGoal.x).toBeGreaterThan(50);
    expect(Math.abs(
      (movedBud.x - initialBud.x) - (movedGoal.x - initialGoal.x),
    )).toBeLessThan(5);
    expect(Math.abs(
      (movedBud.y - initialBud.y) - (movedGoal.y - initialGoal.y),
    )).toBeLessThan(5);
    await expect(
      page.getByLabel('Goal inspector for Train three times weekly'),
    ).toHaveCount(0);

    await page.reload();
    await expect(page.getByLabel('Constellation graph canvas')).toBeVisible();
    await expect.poll(async () => (await goal.boundingBox())?.x ?? 0).toBeCloseTo(
      movedGoal.x,
      0,
    );

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
    const reset = page.waitForResponse((response) => (
      new URL(response.url()).pathname === '/api/constellation/layout'
      && response.request().method() === 'DELETE'
    ));
    await page.getByRole('button', {
      name: 'Reset saved Constellation node positions',
    }).click();
    await reset;
    await expect.poll(async () => (await goal.boundingBox())?.x ?? 0).toBeCloseTo(
      initialGoal.x,
      0,
    );
  });

  test('direct URL selection opens the matching Reflection and Escape removes selection', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page);
    await openLiveConstellation(
      page,
      '/constellation?selected=node%3Arenderer-reflection-motion',
    );

    await expect(
      page.getByLabel('Reflection inspector for Movement clears the fog'),
    ).toBeVisible();
    await expect(
      page.getByText('Real valence history', { exact: true }),
    ).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page).toHaveURL(/\/constellation$/);
    await expect(
      page.getByLabel('Reflection inspector for Movement clears the fog'),
    ).toHaveCount(0);
  });

  test('goal focus exposes BRT nodes and opens an in-place category inspector', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page);
    await openLiveConstellation(page);
    await selectNode(page, 'goal', 'Train three times weekly');

    const budNode = page.getByRole('button', {
      name: 'Bud goal Entry summary, 1 Entry',
      exact: true,
    });
    await expect(budNode).toBeVisible();
    await budNode.press('Enter');

    await expect(page).toHaveURL(/\/constellation$/);
    await expect(
      page.getByLabel('Bud goal Entry inspector'),
    ).toBeVisible();
    await expect(page.getByText('The shape of consistency')).toBeVisible();
  });

  test('creates, edits, and archives a user-authored draft annotation', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page);
    await openLiveConstellation(page);

    await page.getByRole('button', { name: 'Create note' }).click();
    await page.getByLabel('Label').fill('Protect recovery');
    await page.getByLabel('Body (optional)').fill(
      'Keep the rest day visible while the habit grows.',
    );
    await page.getByRole('button', {
      name: 'Create Note',
      exact: true,
    }).click();

    await expect(page).toHaveURL(/\/constellation$/);
    await expect(
      page.getByLabel('Note inspector for Protect recovery'),
    ).toBeVisible();
    await expect(page.url()).not.toContain('Protect');
    await expect(page.url()).not.toContain('rest');

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Label').fill('Protect recovery and sleep');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(
      page.getByLabel('Note inspector for Protect recovery and sleep'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Archive annotation' }).click();
    await page.getByRole('button', {
      name: 'Confirm archive annotation',
    }).click();

    await expect(page).toHaveURL(/\/constellation$/);
    await expect(
      page.getByRole('button', {
        name: 'User-authored Note draft: Protect recovery and sleep',
      }),
    ).toHaveCount(0);
  });

  test('searches Echo, links with Bud, edits through Rose and Thorn, then unlinks', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page);
    await openLiveConstellation(page);
    await selectNode(page, 'goal', 'Train three times weekly');
    await expect(
      page.getByLabel('Goal inspector for Train three times weekly'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Add entry reference' }).click();
    await page.getByLabel('Search your entries').fill('new practice');
    await page.getByRole('button', {
      name: `Select entry ${acceptanceEchoOption.title}`,
    }).click();
    await page.getByRole('button', {
      name: 'Bud category',
    }).click();
    await page.getByRole('button', { name: 'Add reference' }).click();

    const evidenceCard = page.getByLabel(
      `Entry evidence ${acceptanceEchoOption.title}`,
    );
    await expect(evidenceCard).toBeVisible();

    await evidenceCard.getByRole('button', { name: 'Edit' }).click();
    await evidenceCard.getByRole('button', {
      name: 'Rose category',
    }).click();
    await evidenceCard.getByRole('button', { name: 'Save' }).click();
    await expect(evidenceCard).toBeVisible();

    await evidenceCard.getByRole('button', { name: 'Edit' }).click();
    await evidenceCard.getByRole('button', {
      name: 'Thorn category',
    }).click();
    await evidenceCard.getByRole('button', { name: 'Save' }).click();

    await evidenceCard.getByRole('button', { name: 'Unlink' }).click();
    await page.getByRole('button', { name: 'Unlink reference' }).click();
    await expect(evidenceCard).toHaveCount(0);
  });

  test('exposes retryable graph, goal-evidence, Reflection, and Echo-search failures', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page, {
      failOnce: [
        'graph',
        'goal-evidence',
        'reflection',
        'echo-search',
      ],
    });
    await page.goto('/constellation');

    await expect(page.getByRole('alert')).toContainText(
      'Constellation returned an invalid response.',
    );
    await page.getByRole('button', {
      name: 'Retry loading Constellation',
    }).click();
    await expect(page.getByLabel('Constellation graph canvas')).toBeVisible();

    await selectNode(page, 'goal', 'Train three times weekly');
    await expect(page.getByText(
      'Could not load goal evidence',
      { exact: true },
    )).toBeVisible();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Add entry reference' }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Close inspector' }).click();
    await expect(page).toHaveURL(/\/constellation$/);

    await selectNode(page, 'reflection', 'Movement clears the fog');
    await expect(page.getByText(
      'Reflection details are unavailable',
      { exact: true },
    )).toBeVisible();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByText('Real valence history', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close inspector' }).click();
    await expect(page).toHaveURL(/\/constellation$/);

    await selectNode(page, 'goal', 'Train three times weekly');
    await page.getByRole('button', { name: 'Add entry reference' }).click();
    await expect(page.getByText(
      'Could not search entries',
      { exact: true },
    )).toBeVisible();
    await page.getByRole('button', { name: 'Retry search' }).click();
    await expect(page.getByRole('button', {
      name: `Select entry ${acceptanceEchoOption.title}`,
    })).toBeVisible();
  });

  test('empty-state CTAs navigate to real product destinations', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page, {
      graph: createSeasonOnlyConstellationGraph(),
    });
    await page.goto('/constellation');

    await expect(
      page.getByRole('heading', {
        name: 'Your Constellation begins with this season.',
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Set a goal' }).click();
    await expect(page).toHaveURL(/\/goals\/create$/);
    await expect(
      page.getByLabel('Acceptance goal creation destination'),
    ).toBeVisible();

    await page.goto('/constellation');
    await page.getByRole('button', { name: 'Write an entry' }).click();
    await expect(page).toHaveURL(/\/echo$/);
    await expect(
      page.getByLabel('Acceptance Echo destination'),
    ).toBeVisible();
  });
});
