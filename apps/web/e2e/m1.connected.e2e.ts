import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const repository = resolve(import.meta.dirname, '../../..');
const fixture = join(repository, 'apps/server/test/boris/fixtures/site');
let projectRoot: string;
let server: ChildProcess | null = null;
let serverLog = '';

async function hashTree(root: string): Promise<string> {
  const rows: string[] = [];
  const visit = async (directory: string, prefix = '') => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path, `${prefix}${entry.name}/`);
      else rows.push(`${prefix}${entry.name}:${createHash('sha256').update(await readFile(path)).digest('hex')}`);
    }
  };
  await visit(root);
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

async function startServer() {
  serverLog = '';
  const child = spawn(process.execPath, [join(repository, 'apps/server/dist/index.js')], {
    cwd: repository,
    env: {
      ...process.env,
      PORT: '8789',
      OBSEQUIOUS_PROJECT_ROOT: projectRoot,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server = child;
  await new Promise<void>((done, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${serverLog}`)), 15_000);
    child.stdout?.on('data', bytes => {
      serverLog = `${serverLog}${String(bytes)}`.slice(-8192);
      if (serverLog.includes('Obsequious server listening')) {
        clearTimeout(timeout);
        done();
      }
    });
    child.stderr?.on('data', bytes => { serverLog = `${serverLog}${String(bytes)}`.slice(-8192); });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Server exited ${code}: ${serverLog}`));
    });
  });
}

async function stopServer() {
  const child = server;
  server = null;
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const stopped = once(child, 'exit');
  child.kill('SIGTERM');
  await stopped;
}

test.beforeAll(async () => {
  const executable = process.env.BORIS_BIN;
  if (!executable) throw new Error('BORIS_BIN is required; connected browser tests never use demo data.');
  const pins = JSON.parse(await readFile(join(repository, 'apps/server/src/boris/approved-builds.json'), 'utf8'));
  const pin = pins.builds[`${process.platform}-${process.arch}`];
  if (!pin) throw new Error('No approved compiler pin exists for this platform.');
  expect(createHash('sha256').update(await readFile(executable)).digest('hex')).toBe(pin.binary.sha256);
});
test.beforeEach(async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'obsequious-m1-browser-'));
  await cp(fixture, projectRoot, { recursive: true });
  await startServer();
});
test.afterEach(async ({ browserName }, info) => {
  // The native server waits for its bounded compiler operation before cleanup.
  test.setTimeout(150_000);
  await stopServer();
  if (projectRoot) await rm(projectRoot, { recursive: true, force: true });
  await info.attach('native-server-log', { body: `Browser: ${browserName}\n${serverLog}`, contentType: 'text/plain' });
});

test('real source, parentage and relationships survive connected navigation and refresh', async ({ page }, info) => {
  const sourcePath = join(projectRoot, 'content/guides/ferns.md');
  const originalSource = (await readFile(sourcePath, 'utf8')).replaceAll('\r\n', '\n').replaceAll('\n', '\r\n');
  await writeFile(sourcePath, originalSource);
  const before = await hashTree(projectRoot);
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.goto('/connected.html?workspace=structure');
  await expect(page.getByRole('region', { name: 'Real project data' })).toContainText('Real data');
  const tree = page.getByRole('tree', { name: 'Outline' });
  await expect(tree.getByRole('button', { name: 'Field Notes', exact: true })).toBeVisible();
  await tree.getByRole('button', { name: 'Ferns of the valley', exact: true }).click();
  const inspector = page.getByRole('complementary', { name: 'Page inspector' });
  await expect(inspector.getByText('guides/ferns', { exact: true })).toBeVisible();
  await expect(inspector.getByText('content/includes/watering-note.md', { exact: true })).toBeVisible();
  const source = page.getByRole('region', { name: 'Raw source of content/guides/ferns.md' });
  await expect(source).toBeVisible();
  expect(await source.textContent()).toBe(originalSource);
  await expect(page.getByText('Demo data', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('real-structure.png') });
  await page.getByRole('link', { name: 'Pages', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/connected.html');
  expect(new URL(page.url()).searchParams.has('scenario')).toBe(false);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Real project data' })).toContainText('Source revision:');
  await expect(page.getByRole('table').getByRole('button', { name: 'Ferns of the valley', exact: true })).toBeVisible();
  expect(requests.some(url => url.includes('/api/v1/pages'))).toBe(true);
  expect(requests.some(url => url.includes('/api/v1/source?'))).toBe(true);
  expect(await hashTree(projectRoot)).toBe(before);
  await info.attach('real-api-requests', { body: JSON.stringify(requests, null, 2), contentType: 'application/json' });
});

test('phone UI shows real content diagnostics, repair, and unsupported conditional IR honestly', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await hashTree(projectRoot);
  const broken = join(projectRoot, 'content/broken.md');
  await writeFile(broken, '---\nparent: missing-parent\n---\n# Broken\n');
  await page.goto('/connected.html?workspace=structure');
  await expect(page.getByText('No valid graph is available', { exact: true })).toBeVisible();
  await expect(page.getByText(/EPARENTMISSING/).first()).toBeVisible();
  await expect(page.getByText(/content\/broken.md:\d+:\d+/).first()).toBeVisible();
  await expect(page.getByRole('tree')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('real-content-failure-390.png') });
  await rm(broken);
  await page.reload();
  await expect(page.getByRole('tree')).toBeVisible();
  const about = join(projectRoot, 'content/about.md');
  const original = await readFile(about, 'utf8');
  await writeFile(about, original.replace('---\n', '---\nrelations: [relates_to=guides/ferns]\n'));
  await page.reload();
  await expect(page.getByText('The producer format is not supported', { exact: true })).toBeVisible();
  await expect(page.getByRole('tree')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('real-unsupported-390.png') });
  await writeFile(about, original);
  await page.reload();
  await expect(page.getByRole('tree')).toBeVisible();
  expect(await hashTree(projectRoot)).toBe(before);
});

test('a stopped real backend never becomes demo or empty data and retry can recover', async ({ page }, info) => {
  await stopServer();
  await page.goto('/connected.html?workspace=structure');
  await expect(page.getByText('The page graph could not be loaded', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Real project data' })).toContainText('Not loaded');
  await expect(page.getByRole('tree')).toHaveCount(0);
  await expect(page.getByText('No pages in this publication', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Demo data', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('real-backend-unavailable.png') });
  await startServer();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('tree')).toBeVisible();
  await page.getByRole('link', { name: 'Readiness', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Readiness is not connected' })).toBeVisible();
  await expect(page.getByText('Demo data', { exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('tree')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/connected.html');
});
