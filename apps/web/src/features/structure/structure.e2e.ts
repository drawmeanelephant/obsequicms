import { expect, test } from '@playwright/test';

test.describe('Structure workspace through the demo entry', () => {
  test('renders both roots and the deep chain, and inspects dependencies', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');

    const tree = page.getByRole('tree', { name: 'Outline' });
    await expect(tree.getByText('Welcome')).toBeVisible();
    await expect(tree.getByText('Field guides')).toBeVisible();
    await expect(tree.getByText('Seasonal fern care')).toBeVisible();

    // Source-only include files never appear as outline pages.
    await expect(
      page.getByText('content/includes/watering-note.md'),
    ).toHaveCount(0);

    await tree.getByText('Ferns of the valley').click();

    const inspector = page.getByRole('complementary', {
      name: 'Page inspector',
    });
    await expect(inspector.getByText('ent-ferns')).toBeVisible();
    await expect(
      inspector.getByText('content/includes/watering-note.md'),
    ).toBeVisible();
    await expect(
      inspector.getByText('Source file — not a page'),
    ).toBeVisible();

    // Selecting a dependency page moves the inspector to that page.
    await inspector
      .getByRole('button', { name: 'About the nursery' })
      .click();
    await expect(
      page
        .getByRole('complementary', { name: 'Page inspector' })
        .getByText('ent-about'),
    ).toBeVisible();
  });

  test('search and combined filters select the expected pages', async ({
    page,
  }) => {
    await page.goto('/?workspace=pages&scenario=populated');

    await page
      .getByRole('textbox', { name: 'Search pages' })
      .fill('plant-care');
    const table = page.getByRole('table');
    await expect(table.getByText('Caring for ferns')).toBeVisible();
    await expect(table.getByText('Seasonal fern care')).toBeVisible();
    await expect(table.getByText('Welcome')).toHaveCount(0);

    await page
      .getByRole('combobox', { name: 'Status filter' })
      .click();
    await page.getByRole('option', { name: 'Draft' }).click();
    await expect(table.getByText('Caring for ferns')).toBeVisible();
    await expect(table.getByText('Seasonal fern care')).toHaveCount(0);
  });

  test('the stale scenario names both revisions and keeps the views usable', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=stale');

    const banner = page.getByText(/This graph is older than the source/);
    await expect(banner).toBeVisible();
    await expect(page.getByText(/019a3c20/)).toBeVisible();
    await expect(page.getByText(/019a3c4e/)).toBeVisible();

    await expect(page.getByRole('tree', { name: 'Outline' })).toBeVisible();
  });

  test('keyboard users can change views and select a page', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');

    // Move focus into the tree with the keyboard and activate a page.
    await page.getByRole('tree', { name: 'Outline' }).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('complementary', { name: 'Page inspector' }),
    ).toBeVisible();

    // Switch to the inventory view with the keyboard.
    await page.getByRole('radio', { name: 'Inventory' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('the workspace stays operable at a 390 CSS pixel viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?workspace=structure&scenario=populated');

    const tree = page.getByRole('tree', { name: 'Outline' });
    await expect(tree.getByText('Welcome')).toBeVisible();

    // Filters wrap rather than overflow.
    await expect(
      page.getByRole('textbox', { name: 'Search pages' }),
    ).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Status filter' }),
    ).toBeVisible();

    // Selecting a page puts the inspector within reach below the view.
    await tree.getByText('Field guides').click();
    const inspector = page.getByRole('complementary', {
      name: 'Page inspector',
    });
    await expect(inspector.getByText('ent-guides')).toBeVisible();
  });
});
