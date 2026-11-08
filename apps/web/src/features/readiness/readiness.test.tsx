import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createDemoClient } from '../../demo';
import { ReadinessPage } from './ReadinessPage';

const clients = {
  populated: createDemoClient('populated'),
  empty: createDemoClient('empty'),
  stale: createDemoClient('stale'),
  'request-error': createDemoClient('request-error'),
} as const;

async function renderReadiness(
  scenario: keyof typeof clients = 'populated',
) {
  render(<ReadinessPage client={clients[scenario]} />);
  await screen.findByRole('heading', { name: 'Site readiness' });
}

describe('ReadinessPage groups and detail (populated)', () => {
  it('groups the fourteen keys under their categories', async () => {
    await renderReadiness();

    expect(
      screen.getByRole('heading', { name: /Discovery and indexing \(6\)/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /Identity and sharing \(4\)/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /Measurement \(1\)/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /Trust and accessibility \(3\)/ }),
    ).toBeVisible();
    for (const label of [
      'robots.txt',
      'XML sitemap',
      'Canonical URLs',
      'Social sharing preview',
      'llms.txt (proposal)',
      'humans.txt',
      'Security contact',
      'About page',
      'Contact page',
      'Privacy policy and consent',
      'Google Search Console',
      'Bing Webmaster Tools',
      'Analytics',
      'Image alt text',
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(screen.queryByText(/cyborgs|mutants/i)).not.toBeInTheDocument();
  });

  it('opens a detail panel that explains purpose, applicability, facts, and the next action', async () => {
    const user = userEvent.setup();
    await renderReadiness();

    // The workspace auto-selects the first item needing attention.
    const detail = await screen.findByRole('complementary', {
      name: 'Readiness item detail',
    });
    expect(within(detail).getByText('robots.txt')).toBeVisible();
    expect(
      within(detail).getByText(/cooperation, not access control/),
    ).toBeVisible();
    expect(
      within(detail).getByText(/Nothing has been generated\./),
    ).toBeVisible();

    await user.click(screen.getByText('XML sitemap'));
    expect(
      within(detail).getByText(/Generated artifacts are not a deployment\./),
    ).toBeVisible();
    expect(
      within(detail).getByText(/Present for the displayed source revision\./),
    ).toBeVisible();
  });

  it('distinguishes deployed-but-not-checked from generated-only and from verified', async () => {
    const user = userEvent.setup();
    await renderReadiness();

    await user.click(screen.getByText('Security contact'));
    const detail = screen.getByRole('complementary', {
      name: 'Readiness item detail',
    });
    expect(within(detail).getByText(/Not checked\./)).toBeVisible();
    expect(within(detail).getByText(/^Present for the displayed release\./)).toBeVisible();

    await user.click(screen.getByText('About page'));
    expect(
      within(detail).getByText('Verdict: passed'),
    ).toBeVisible();
    expect(
      within(detail).getByText(/evidence record/i),
    ).toBeVisible();
  });

  it('shows stale passing evidence as stale, not as a pass', async () => {
    const user = userEvent.setup();
    await renderReadiness();

    await user.click(screen.getByText('Canonical URLs'));
    const detail = screen.getByRole('complementary', {
      name: 'Readiness item detail',
    });
    expect(
      screen.getAllByText('Observation: stale').length,
    ).toBeGreaterThanOrEqual(1);
    expect(within(detail).getByText(/This observation is stale/)).toBeVisible();
    expect(within(detail).getByText(/Observed for release/)).toBeVisible();
  });

  it('keeps failures, manual review, and not-applicable records distinct', async () => {
    const user = userEvent.setup();
    await renderReadiness();

    await user.click(screen.getByText('Social sharing preview'));
    const detail = screen.getByRole('complementary', {
      name: 'Readiness item detail',
    });
    expect(within(detail).getByText('Verdict: failed')).toBeVisible();

    await user.click(screen.getByText('Image alt text'));
    expect(within(detail).getByText('Verdict: needs_review')).toBeVisible();

    await user.click(screen.getByText('llms.txt (proposal)'));
    expect(within(detail).getByText('Verdict: not_applicable')).toBeVisible();
    expect(
      within(detail).getByText(/different from unknown/),
    ).toBeVisible();
    expect(
      within(detail).getByText(/no adopted-standards status/),
    ).toBeVisible();
  });

  it('explains the honest boundaries of specific items', async () => {
    const user = userEvent.setup();
    await renderReadiness();

    await user.click(screen.getByText('Security contact'));
    expect(
      screen.getByText(/different artifact from a human-readable security page/),
    ).toBeVisible();

    await user.click(screen.getByText('Privacy policy and consent'));
    expect(screen.getByText(/analytics is optional/i)).toBeVisible();

    await user.click(screen.getByText('Analytics'));
    expect(
      screen.getByText(/not a ranking requirement/i),
    ).toBeVisible();
  });

  it('filters by attention and updates the count', async () => {
    const user = userEvent.setup();
    await renderReadiness();

    expect(screen.getByText(/\d+ of 14 items need attention\./)).toBeVisible();

    await user.click(screen.getByRole('radio', { name: 'Needs attention' }));

    expect(screen.queryByText('About page')).not.toBeInTheDocument();
    expect(screen.queryByText('Contact page')).not.toBeInTheDocument();
    expect(screen.getByText('Canonical URLs')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /Measurement \(1\)/ }),
    ).toBeVisible();

    await user.click(screen.getByRole('radio', { name: 'All items' }));
    expect(screen.getByText('About page')).toBeVisible();
  });

  it('explains that actions are not connected instead of faking success', async () => {
    const user = userEvent.setup();
    await renderReadiness();

    const detail = await screen.findByRole('complementary', {
      name: 'Readiness item detail',
    });
    await user.click(
      within(detail).getByRole('button', {
        name: 'Generate and check robots.txt',
      }),
    );
    expect(
      within(detail).getByText(/changed nothing and ran no check/),
    ).toBeVisible();
    // No fake observation appears.
    expect(within(detail).queryByText('Verdict: passed')).not.toBeInTheDocument();
  });
});

describe('ReadinessPage other scenarios', () => {
  it('renders the empty scenario as items that all need setup', async () => {
    await renderReadiness('empty');

    expect(screen.getAllByText('Not set up')).toHaveLength(14);
    expect(
      screen.getByText(/14 of 14 items need attention\./),
    ).toBeVisible();
  });

  it('renders stale readiness data with stale generated evidence', async () => {
    await renderReadiness('stale');

    const robotsRow = screen.getByText('robots.txt');
    expect(robotsRow).toBeVisible();
    expect(screen.getAllByText('Observation: stale').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Generated: stale').length).toBeGreaterThanOrEqual(1);
  });

  it('renders a failed request as an explicit error with retry and no fallback', async () => {
    const user = userEvent.setup();
    await renderReadiness('request-error');

    expect(
      await screen.findByText(/Readiness data could not be loaded/),
    ).toBeVisible();
    expect(
      screen.getByText(/The data source returned unavailable/),
    ).toBeVisible();
    expect(screen.queryByText('robots.txt')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      screen.getByText(/Readiness data could not be loaded/),
    ).toBeVisible();
  });
});
