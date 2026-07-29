import {
  expect,
  test,
  type Page,
} from '@playwright/test';
import {
  acceptanceEchoOption,
  createLockedConstellationGraph,
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

  test('node selection enters Focus mode, writes URL selection, and closes cleanly', async ({
    page,
  }) => {
    await installConstellationAcceptanceApi(page);
    await openLiveConstellation(page);

    await page
      .getByLabel('Visual Constellation graph')
      .getByText('Train three times weekly', { exact: true })
      .click();

    await expect(page).toHaveURL(
      /\/constellation\?selected=node%3Arenderer-goal-train$/,
    );
    await expect(
      page.getByRole('heading', { name: 'Constellation · Focus' }),
    ).toBeVisible();
    await expect(
      page.getByLabel('Goal inspector for Train three times weekly'),
    ).toBeVisible();
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

    await expect(page).toHaveURL(
      /selected=annotation%3Aacceptance-annotation-1$/,
    );
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
      name: 'Bud evidence category',
    }).click();
    await page.getByRole('button', { name: 'Add reference' }).click();

    const evidenceCard = page.getByLabel(
      `Echo evidence ${acceptanceEchoOption.title}`,
    );
    await expect(evidenceCard).toBeVisible();

    await evidenceCard.getByRole('button', { name: 'Edit' }).click();
    await evidenceCard.getByRole('button', {
      name: 'Rose evidence category',
    }).click();
    await evidenceCard.getByRole('button', { name: 'Save' }).click();
    await expect(evidenceCard).toBeVisible();

    await evidenceCard.getByRole('button', { name: 'Edit' }).click();
    await evidenceCard.getByRole('button', {
      name: 'Thorn evidence category',
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
      graph: createLockedConstellationGraph(),
    });
    await page.goto('/constellation');

    await expect(
      page.getByRole('heading', {
        name: "A quiet map of who you're becoming.",
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
