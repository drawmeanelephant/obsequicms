import { expect, test } from '@playwright/test';

/**
 * Entry-point checks (established in P00, updated to the P02 application
 * composition): the browser shows Obsequious and an explicit prototype
 * label, and feature destinations are reachable.
 */
test.describe('application entry point', () => {
  test('shows the Obsequious brand and the prototype label by accessible name', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');

    await expect(
      page.getByRole('navigation', { name: 'Application' }).getByRole('link', { name: 'Obsequious' }),
    ).toBeVisible();
    await expect(page.getByRole('banner')).toContainText('Demo data');
    await expect(
      page.getByText(/nothing here is live, saved, or verified/i),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Structure',
    );
  });

  test('renders a workspace heading and reachable destinations', async ({
    page,
  }) => {
    await page.goto('/?workspace=readiness&scenario=populated');

    await expect(
      page.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', {
        name: 'Structure',
        exact: true,
      }),
    ).toBeVisible();
  });
});
