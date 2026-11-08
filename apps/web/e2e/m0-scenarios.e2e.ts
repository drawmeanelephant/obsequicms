import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SCREENSHOT_DIR = join(process.cwd(), 'docs/work-reports/screenshots');

async function capture(page: import('@playwright/test').Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`) });
}

/**
 * P05 integration scenarios through the real demo entry point. These
 * cross workspaces the way an operator would: select a page, inspect its
 * dependencies, then read readiness evidence.
 */
test.describe('M0 integrated prototype', () => {
  test('a page selection reaches its dependency details across navigation', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=populated');

    const tree = page.getByRole('tree', { name: 'Outline' });
    await tree.getByText('Ferns of the valley').click();

    const inspector = page.getByRole('complementary', { name: 'Page inspector' });
    await expect(inspector.getByText('ent-ferns')).toBeVisible();
    // Incoming parent edge from the child, outgoing include to a source
    // file that is never rendered as a page.
    await expect(
      inspector.getByRole('button', { name: 'Caring for ferns' }),
    ).toBeVisible();
    await expect(
      inspector.getByText('content/includes/watering-note.md'),
    ).toBeVisible();
    await expect(
      inspector.getByText('Source file — not a page'),
    ).toBeVisible();

    // Following a dependency keeps the workspace and updates the inspector.
    await inspector
      .getByRole('button', { name: 'About the nursery' })
      .click();
    await expect(
      page
        .getByRole('complementary', { name: 'Page inspector' })
        .getByText('ent-about'),
    ).toBeVisible();

    await capture(page, 'structure-inspector-dependencies');
  });

  test('readiness separates generated-but-unverified from stale passing evidence', async ({
    page,
  }) => {
    await page.goto('/?workspace=readiness&scenario=populated');

    // Generated for the current revision, deployed nowhere, never checked:
    // no verdict and no deployment claim exist.
    await page.getByRole('button', { name: /XML sitemap/ }).click();
    const detail = page.getByRole('complementary', {
      name: 'Readiness item detail',
    });
    await expect(
      detail.getByText(/Present for the displayed source revision\./),
    ).toBeVisible();
    await expect(
      detail.getByText(/Generated artifacts are not a deployment\./),
    ).toBeVisible();
    await expect(detail.getByText(/Verdict:/)).toHaveCount(0);

    // Passed evidence for an older release displays as stale, naming both
    // releases, with the evidence record visible.
    await page.getByRole('button', { name: /Canonical URLs/ }).click();
    await expect(
      detail.getByText(/This observation is stale/),
    ).toBeVisible();
    await expect(detail.getByText(/Observed for release 019a2f10/)).toBeVisible();
    // The stale reason appears in the banner and in the deployment
    // metadata; assert on the banner copy specifically.
    await expect(
      detail.getByText(/the displayed release is 019a3c4e/).first(),
    ).toBeVisible();
    await expect(detail.getByText('Verdict: passed')).toBeVisible();
    await expect(
      detail.getByText('019a3c50-0004-7cc0-a1b2-c3d4e5f60004'),
    ).toBeVisible();

    await capture(page, 'readiness-stale-evidence');
  });

  test('request errors never render as plausible empty data', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=request-error');
    await expect(
      page.getByText(/The page graph could not be loaded/),
    ).toBeVisible();
    await expect(page.getByRole('tree')).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByRole('banner')).toContainText('Demo data');

    await page.goto('/?workspace=readiness&scenario=request-error');
    await expect(
      page.getByText(/Readiness data could not be loaded/),
    ).toBeVisible();
    await expect(page.getByText('robots.txt')).toHaveCount(0);
  });

  test('unsupported and empty graphs are distinct, and unsupported is not a valid site', async ({
    page,
  }) => {
    await page.goto('/?workspace=structure&scenario=unsupported');
    await expect(
      page.getByText(/The producer format is not supported/),
    ).toBeVisible();

    await page.goto('/?workspace=structure&scenario=empty');
    await expect(
      page.getByRole('heading', { name: 'No pages in this publication' }),
    ).toBeVisible();
    // EmptyState mirrors its description into a body-level aria-live
    // region: scope to the empty state that carries the heading instead of
    // picking a blind first match.
    await expect(
      page
        .getByRole('heading', { name: 'No pages in this publication' })
        .locator('xpath=..')
        .getByText(/different from an unavailable or unsupported producer/),
    ).toBeVisible();
  });

  test('scenario switching through the demo banner keeps workspaces stable', async ({
    page,
  }) => {
    await page.goto('/?workspace=readiness&scenario=populated');

    await page
      .getByRole('combobox', { name: 'Demo scenario' })
      .selectOption('stale');
    await page.waitForURL(/scenario=stale/);

    await expect(
      page.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();
    await expect(page.getByRole('banner')).toContainText('Demo data');
    await expect(
      page.getByRole('combobox', { name: 'Demo scenario' }),
    ).toHaveValue('stale');
    await expect(
      page.getByRole('button', { name: /Observation: stale/ }).first(),
    ).toBeVisible();
  });

  test('the full operator path works at 390 CSS pixels', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?workspace=structure&scenario=populated');

    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'Readiness' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Canonical URLs/ }).click();
    const detail = page.getByRole('complementary', {
      name: 'Readiness item detail',
    });
    await expect(detail.getByText(/This observation is stale/)).toBeVisible();

    await capture(page, 'readiness-390');
  });
});
