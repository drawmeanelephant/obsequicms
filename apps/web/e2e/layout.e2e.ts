import { expect, test } from '@playwright/test';

for (const width of [390, 768, 1024, 1440]) {
  for (const workspace of ['structure', 'pages', 'readiness']) {
    test(`${workspace} keeps controls and details usable at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/?workspace=${workspace}&scenario=populated`);
      await expect(page.getByRole('banner')).toContainText('Demo data');
      await expect(
        page.getByRole('combobox', { name: 'Demo scenario' }),
      ).toBeVisible();

      if (workspace === 'readiness') {
        await page.getByRole('button', { name: /XML sitemap/ }).click();
        await expect(
          page.getByRole('complementary').getByText(
            /Generated artifacts are not a deployment/,
          ),
        ).toBeVisible();
      } else {
        if (workspace === 'structure') {
          await page.getByRole('tree').getByRole('button', {
            name: 'Ferns of the valley',
            exact: true,
          }).click();
        } else {
          await page.getByRole('textbox', { name: 'Search pages' }).fill('ferns');
          await page.getByRole('table').getByRole('button', {
            name: 'Ferns of the valley',
            exact: true,
          }).click();
        }
        await expect(
          page.getByRole('complementary').getByText('ent-ferns'),
        ).toBeVisible();
      }

      const overflow = await page.getByRole('main').evaluate((main) => {
        return {
          document: document.documentElement.scrollWidth > innerWidth,
          main: main.scrollWidth > main.clientWidth,
        };
      });
      expect(overflow).toEqual({ document: false, main: false });

      const descriptionLines = await page.locator('.workspace-page > p').evaluate(
        (paragraph) => {
          const lines = new Map<number, number>();
          const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
          const range = document.createRange();
          while (walker.nextNode()) {
            const node = walker.currentNode;
            for (let index = 0; index < (node.textContent?.length ?? 0); index += 1) {
              range.setStart(node, index);
              range.setEnd(node, index + 1);
              const rect = range.getBoundingClientRect();
              if (rect.width > 0) {
                const line = Math.round(rect.top);
                lines.set(line, (lines.get(line) ?? 0) + 1);
              }
            }
          }
          return [...lines.values()];
        },
      );
      expect(descriptionLines.length).toBeGreaterThan(0);
      expect(Math.max(...descriptionLines)).toBeLessThanOrEqual(80);

      const detail = await page.getByRole('complementary').boundingBox();
      const list = await page.locator(
        workspace === 'readiness' ? '.readiness-main' : '.structure-main',
      ).boundingBox();
      expect(detail).not.toBeNull();
      expect(list).not.toBeNull();
      if (width === 1440) {
        expect(detail!.x).toBeGreaterThanOrEqual(list!.x + list!.width);
      } else {
        expect(detail!.y).toBeGreaterThanOrEqual(list!.y + list!.height);
      }

      await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('workspace.png') });
    });
  }
}

test('the demo selector has visible keyboard focus and a touch-sized mobile target', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const selector = page.getByRole('combobox', { name: 'Demo scenario' });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(selector).toBeFocused();
  expect(await selector.evaluate(
    (element) => element.matches(':focus-visible'),
  )).toBe(true);
  await expect(selector).toHaveCSS('outline-style', 'solid');
  expect((await selector.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [390, 1440]) {
    test(`readiness stays readable in ${colorScheme} mode at ${width}px`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/?workspace=readiness&scenario=populated');
      await expect(page.getByRole('button', { name: /XML sitemap/ })).toBeVisible();

      const contrasts = await page.locator(
        '.workspace-page > p, .demo-banner-note, .readiness-item-label, .readiness-item-badges .astryx-badge',
      ).evaluateAll((elements) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d')!;
        const luminance = (pixel: Uint8ClampedArray) => {
          const rgb = Array.from(pixel).slice(0, 3).map((value) => {
            const channel = value / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return rgb.reduce(
            (sum, channel, index) =>
              sum + channel * (index === 0 ? 0.2126 : index === 1 ? 0.7152 : 0.0722),
            0,
          );
        };
        return elements.map((element) => {
          const ancestors: Element[] = [];
          for (let node: Element | null = element; node; node = node.parentElement) {
            ancestors.unshift(node);
          }
          context.fillStyle = 'white';
          context.fillRect(0, 0, 1, 1);
          for (const ancestor of ancestors) {
            context.fillStyle = getComputedStyle(ancestor).backgroundColor;
            context.fillRect(0, 0, 1, 1);
          }
          const background = luminance(context.getImageData(0, 0, 1, 1).data);
          context.fillStyle = getComputedStyle(element).color;
          context.fillRect(0, 0, 1, 1);
          const foreground = luminance(context.getImageData(0, 0, 1, 1).data);
          return {
            text: element.textContent,
            ratio: (Math.max(background, foreground) + 0.05) /
              (Math.min(background, foreground) + 0.05),
          };
        });
      });
      expect(contrasts.length).toBeGreaterThan(14);
      for (const { text, ratio } of contrasts) {
        expect(ratio, `${text} contrast`).toBeGreaterThanOrEqual(4.5);
      }
      expect(errors).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('theme.png') });
    });
  }
}
