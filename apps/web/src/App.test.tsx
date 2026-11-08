import { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createDemoClient } from './demo';

const WORKSPACE_LABELS = [
  'Pages',
  'Structure',
  'Editor',
  'Media',
  'Readiness',
  'Analytics',
  'Publish',
  'Settings',
];

function renderApp(search = '?workspace=structure&scenario=populated') {
  window.history.pushState(null, '', search);
  return render(<App client={createDemoClient('populated')} />);
}

describe('App shell', () => {
  it('renders persistent navigation with every destination by accessible name', () => {
    renderApp();

    const navigation = screen.getByRole('navigation', { name: 'Main' });
    expect(navigation).toBeVisible();
    for (const label of WORKSPACE_LABELS) {
      expect(
        screen.getByRole('link', { name: label }),
      ).toBeVisible();
    }
  });

  it('marks the current destination with aria-current and shows the brand', () => {
    renderApp();

    expect(screen.getByRole('link', { name: 'Structure' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Pages' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('switches workspaces on activation and updates the URL, preserving the scenario', async () => {
    const user = userEvent.setup();
    renderApp('?workspace=structure&scenario=stale');

    await user.click(screen.getByRole('link', { name: 'Readiness' }));

    expect(screen.getByRole('heading', { name: 'Site readiness' })).toBeVisible();
    expect(window.location.search).toBe('?workspace=readiness&scenario=stale');
    expect(screen.getByRole('link', { name: 'Readiness' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('opens the Structure feature in inventory mode for Pages and outline mode for Structure', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('link', { name: 'Pages' }));
    const structureSection = screen.getByRole('region', { name: 'Structure' });
    expect(structureSection).toHaveAttribute('data-view', 'inventory');

    await user.click(screen.getByRole('link', { name: 'Structure' }));
    expect(
      screen.getByRole('region', { name: 'Structure' }),
    ).toHaveAttribute('data-view', 'outline');
  });

  it('unimplemented destinations explain their limits without sample content', async () => {
    const user = userEvent.setup();
    renderApp();

    for (const label of ['Editor', 'Media', 'Analytics', 'Publish', 'Settings']) {
      await user.click(screen.getByRole('link', { name: label }));
      expect(
        screen.getByRole('heading', { name: `${label} is not connected` }),
      ).toBeVisible();
    }
  });
});

describe('workspace router', () => {
  it('follows back and forward through workspace history', async () => {
    const user = userEvent.setup();
    renderApp('?workspace=structure&scenario=populated');

    await user.click(screen.getByRole('link', { name: 'Readiness' }));
    expect(window.location.search).toBe('?workspace=readiness&scenario=populated');

    // Back triggers popstate asynchronously in jsdom; the act scope waits
    // for the resulting route update to flush.
    await act(async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole('heading', { name: 'Structure' })).toBeVisible();
  });
});
