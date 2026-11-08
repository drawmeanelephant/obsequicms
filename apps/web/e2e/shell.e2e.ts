import { expect, test, type Page } from '@playwright/test';

const DESTINATIONS = [
  'Pages',
  'Structure',
  'Editor',
  'Media',
  'Readiness',
  'Analytics',
  'Publish',
  'Settings',
];

/**
 * Presses Tab until the element with the given accessible name is focused.
 * Bounded so a broken focus order fails the test instead of hanging.
 */
async function tabTo(page: Page, name: string, maxTabs = 20): Promise<void> {
  for (let index = 0; index < maxTabs; index += 1) {
    const active = page.locator(':focus');
    const activeName =
      (await active
        .textContent({ timeout: 250 })
        .catch(() => '')) ?? '';
    const ariaLabel = await active
      .getAttribute('aria-label', { timeout: 250 })
      .catch(() => null);
    if (activeName.trim() === name || ariaLabel === name) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached an element named "${name}"`);
}

test.describe('application shell', () => {
  test('shows the brand, the persistent demo label, and all destinations', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');

    await expect(page.getByRole('banner')).toContainText('Demo data');
    await expect(
      page.getByText(/nothing here is live, saved, or verified/i),
    ).toBeVisible();

    const navigation = page.getByRole('navigation', { name: 'Main' });
    await expect(navigation).toBeVisible();
    for (const label of DESTINATIONS) {
      await expect(
        navigation.getByRole('link', { name: label, exact: true }),
      ).toBeVisible();
    }
    await expect(
      navigation.getByRole('link', { name: 'Structure', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('keyboard users reach a destination with a visible focus state and activate it', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');

    await tabTo(page, 'Readiness');
    const focused = page.locator(':focus');
    await expect(focused).toHaveAccessibleName('Readiness');
    expect(await focused.evaluate((el) => el.matches(':focus-visible'))).toBe(
      true,
    );

    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/workspace=readiness&scenario=populated/);
  });

  test('navigation preserves the selected scenario in the URL', async ({
    page,
  }) => {
    await page.goto('/?workspace=readiness&scenario=stale');

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Pages', exact: true })
      .click();

    await expect(page).toHaveURL(/workspace=pages&scenario=stale/);
  });

  test('modified clicks keep native behavior and open a new tab', async ({
    page,
    context,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');

    // Cmd/Ctrl-click is the browser's, not the router's: a new tab opens
    // with the same destination, preserving the scenario parameter, while
    // the current tab stays exactly where it was.
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: 'Readiness' })
        .click({ modifiers: ['ControlOrMeta'] }),
    ]);
    await expect(popup).toHaveURL(/workspace=readiness&scenario=populated/);

    await expect(page).toHaveURL(/workspace=structure&scenario=populated/);
    await expect(
      page.getByRole('heading', { name: 'Structure' }),
    ).toBeVisible();
  });

  test('browser back and forward follow the workspace history', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');
    const navigation = page.getByRole('navigation', { name: 'Main' });

    await navigation.getByRole('link', { name: 'Readiness' }).click();
    await expect(page).toHaveURL(/workspace=readiness&scenario=populated/);
    await expect(
      page.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/workspace=structure&scenario=populated/);
    await expect(
      page.getByRole('heading', { name: 'Structure' }),
    ).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/workspace=readiness&scenario=populated/);
    await expect(
      page.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();
  });

  test('unimplemented destinations explain that they are not connected', async ({
    page,
  }) => {
    await page.goto('/?workspace=publish&scenario=populated');

    await expect(
      page.getByRole('heading', { name: 'Publish is not connected' }),
    ).toBeVisible();
    // EmptyState mirrors its description into a body-level aria-live
    // region, so scope to the empty state that carries the heading: the
    // workspace must hold the visible copy without picking a blind first
    // match.
    const publishState = page
      .getByRole('heading', { name: 'Publish is not connected' })
      .locator('xpath=..');
    await expect(
      publishState.getByText(/No build, release, or deployment can be started/),
    ).toBeVisible();
  });

  test('the request-error scenario still renders the shell without fallback data', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=request-error');

    await expect(page.getByRole('banner')).toContainText('Demo data');
    await expect(
      page.getByRole('navigation', { name: 'Main' }),
    ).toBeVisible();
    // The workspace shows an explicit error state: no blank screen, no
    // substitute data.
    await expect(
      page.getByText(/The page graph could not be loaded/),
    ).toBeVisible();
    await expect(page.getByRole('tree')).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);
  });

  test('at a 390 CSS pixel viewport the navigation drawer opens and destinations work', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?workspace=structure&scenario=populated');

    await expect(page.getByRole('banner')).toBeVisible();

    await page.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'Readiness' }).click();

    await expect(
      page.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/workspace=readiness&scenario=populated/);
  });
});
