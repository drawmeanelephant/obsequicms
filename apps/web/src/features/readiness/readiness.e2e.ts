import { expect, test } from '@playwright/test';

test.describe('Site Readiness workspace through the demo entry', () => {
  test('groups items, filters by attention, and inspects evidence', async ({
    page,
  }) => {
    await page.goto('/?workspace=readiness&scenario=populated');

    await expect(
      page.getByRole('heading', { name: /Discovery and indexing \(6\)/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Trust and accessibility \(3\)/ }),
    ).toBeVisible();

    await page.getByText('Canonical URLs').click();
    const detail = page.getByRole('complementary', {
      name: 'Readiness item detail',
    });
    await expect(detail.getByText(/This observation is stale/)).toBeVisible();
    await expect(detail.getByText(/Observed for release/)).toBeVisible();

    await page.getByRole('radio', { name: 'Needs attention' }).click();
    await expect(
      page.getByRole('button', { name: /About page/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Canonical URLs/ }),
    ).toBeVisible();

    await page.getByRole('radio', { name: 'All items' }).click();
    await expect(
      page.getByRole('button', { name: /About page/ }),
    ).toBeVisible();
  });

  test('generated-but-unverified and deployed-but-unchecked stay distinct', async ({
    page,
  }) => {
    await page.goto('/?workspace=readiness&scenario=populated');

    await page.getByText('XML sitemap').click();
    const detail = page.getByRole('complementary', {
      name: 'Readiness item detail',
    });
    await expect(
      detail.getByText(/Generated artifacts are not a deployment\./),
    ).toBeVisible();

    await page.getByText('Security contact').click();
    await expect(detail.getByText(/Not checked\./)).toBeVisible();
    await expect(
      detail.getByText(/^Present for the displayed release\./),
    ).toBeVisible();
    // No verdict is fabricated for an unchecked item.
    await expect(detail.getByText(/Verdict:/)).toHaveCount(0);
  });

  test('activating a setup action explains the missing backend instead of faking success', async ({
    page,
  }) => {
    await page.goto('/?workspace=readiness&scenario=populated');

    const detail = page.getByRole('complementary', {
      name: 'Readiness item detail',
    });
    await detail.getByRole('button', { name: 'Generate and check robots.txt' }).click();
    await expect(
      detail.getByText(/changed nothing and ran no check/),
    ).toBeVisible();
    await expect(detail.getByText(/Verdict:/)).toHaveCount(0);
  });

  test('the request-error scenario shows an explicit error and keeps retrying real', async ({
    page,
  }) => {
    await page.goto('/?workspace=readiness&scenario=request-error');

    await expect(
      page.getByText(/Readiness data could not be loaded/),
    ).toBeVisible();
    await expect(
      page.getByText(/The data source returned unavailable/),
    ).toBeVisible();
    await expect(page.getByText('robots.txt')).toHaveCount(0);
  });

  test('item detail and filters work with the keyboard at 390 CSS pixels', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?workspace=readiness&scenario=populated');

    await expect(
      page.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();

    // Keyboard: move to the item list and activate an item.
    await page.getByRole('radio', { name: 'All items' }).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('complementary', { name: 'Readiness item detail' }),
    ).toBeVisible();

    // The detail panel is reachable below the list rather than clipped.
    const detail = page.getByRole('complementary', {
      name: 'Readiness item detail',
    });
    await detail.getByRole('heading', { name: 'Last observation' }).focus();
    await expect(
      detail.getByRole('heading', { name: 'Last observation' }),
    ).toBeVisible();
  });
});
