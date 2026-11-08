import { expect, test } from '@playwright/test';

test.describe('application entry point', () => {
  test('shows the Obsequious heading and the prototype label by accessible name', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Obsequious' }),
    ).toBeVisible();
    await expect(page.getByTestId('prototype-label')).toContainText(
      /demo data/i,
    );
    await expect(page.getByTestId('prototype-label')).toContainText(
      /not connected/i,
    );
  });

  test('renders both feature placeholders with their not-connected explanation', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Structure' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();
    await expect(page.getByText(/^Not connected:/)).toHaveCount(2);
  });
});
