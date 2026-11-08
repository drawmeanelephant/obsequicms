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

  test('search reveals a match under a branch collapsed beforehand', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');

    const tree = page.getByRole('tree', { name: 'Outline' });
    const guides = tree.getByRole('treeitem', { name: 'Field guides' });

    // Collapse the branch from the keyboard first. The click targets the
    // row's label: a treeitem's bounding box spans its expanded subtree,
    // so clicking the item itself would land on a descendant row.
    await tree.getByText('Field guides').click();
    await page.keyboard.press('ArrowLeft');
    await expect(guides).toHaveAttribute('aria-expanded', 'false');
    await expect(tree.getByText('Ferns of the valley')).toHaveCount(0);

    // Searching for the descendant under the collapsed branch reveals it.
    await page
      .getByRole('textbox', { name: 'Search pages' })
      .fill('Ferns of the valley');
    await expect(guides).toHaveAttribute('aria-expanded', 'true');
    await expect(tree.getByText('Ferns of the valley')).toBeVisible();

    // Narrowing the filters keeps the revealed match visible.
    await page.getByRole('combobox', { name: 'Status filter' }).click();
    await page.getByRole('option', { name: 'Published' }).click();
    await expect(tree.getByText('Ferns of the valley')).toBeVisible();

    // Clearing filters widens back to the full outline.
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(tree.getByText('Seasonal fern care')).toBeVisible();

    // A second search after clearing works too.
    await page.getByRole('textbox', { name: 'Search pages' }).fill('Mosses');
    await expect(tree.getByText('Mosses of the shaded paths')).toBeVisible();
    await expect(
      tree.getByRole('treeitem', { name: 'Field guides' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  test('the search-reveal flow stays operable at a 390 CSS pixel viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?workspace=structure&scenario=populated');

    const tree = page.getByRole('tree', { name: 'Outline' });
    const guides = tree.getByRole('treeitem', { name: 'Field guides' });

    await tree.getByText('Field guides').click();
    await page.keyboard.press('ArrowLeft');
    await expect(guides).toHaveAttribute('aria-expanded', 'false');

    await page
      .getByRole('textbox', { name: 'Search pages' })
      .fill('Ferns of the valley');
    await expect(tree.getByText('Ferns of the valley')).toBeVisible();

    // The inspector for the revealed page is reachable below the view.
    await tree.getByText('Ferns of the valley').click();
    await expect(
      page
        .getByRole('complementary', { name: 'Page inspector' })
        .getByText('ent-ferns'),
    ).toBeVisible();
  });

  test('keyboard users activate a named page and the inspector shows it', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');

    // The roving tab stop starts on the auto-selected first root (Welcome).
    // Walk down with ArrowDown until the fern guide row holds focus, then
    // activate it, so the test proves the inspector changed rather than
    // merely exists.
    const welcomeRow = page.locator('[data-tree-id="ent-home"]');
    await welcomeRow.focus();
    await expect(welcomeRow).toBeFocused();

    let fernsFocused = false;
    for (let step = 0; step < 20; step += 1) {
      const focusedId = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-tree-id') ?? null,
      );
      if (focusedId === 'ent-ferns') {
        fernsFocused = true;
        break;
      }
      await page.keyboard.press('ArrowDown');
    }
    expect(fernsFocused).toBe(true);
    await page.keyboard.press('Enter');

    const inspector = page.getByRole('complementary', {
      name: 'Page inspector',
    });
    await expect(inspector.getByText('ent-ferns')).toBeVisible();
    await expect(inspector.getByText('ent-home')).toHaveCount(0);

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
