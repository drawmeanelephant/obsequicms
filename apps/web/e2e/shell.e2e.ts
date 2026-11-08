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

  test('unimplemented destinations explain that they are not connected', async ({
    page,
  }) => {
    await page.goto('/?workspace=publish&scenario=populated');

    await expect(
      page.getByRole('heading', { name: 'Publish is not connected' }),
    ).toBeVisible();
    // EmptyState mirrors its description into an aria-live region, so the
    // text legitimately appears twice; the first match is the visible copy.
    await expect(
      page.getByText(/No build, release, or deployment can be started/).first(),
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
    await expect(
      page.getByText(/^Not connected: this is a project-scaffold placeholder/),
    ).toHaveCount(1);
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
