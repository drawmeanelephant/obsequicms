import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectedApp } from './ConnectedApp';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('separate connected composition', () => {
  it('labels actual responses as real and preserves the connected entry during navigation', async () => {
    window.history.replaceState(null, '', '/connected.html?scenario=populated');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      sourceRevision: 'response-snapshot', graphRevision: 'response-snapshot',
      state: 'current', pages: [], dependencies: [], problems: [],
    }))));
    render(<ConnectedApp />);
    expect(await screen.findByText(/Source revision: response-snapshot/)).toBeVisible();
    expect(screen.queryByText('Demo data')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: /^Pages$/ }));
    expect(window.location.pathname).toBe('/connected.html');
    expect(window.location.search).toBe('?workspace=pages');
    expect(screen.getByText(/Real data/)).toBeVisible();
  });
  it('keeps an unavailable backend explicit without importing demo content', async () => {
    window.history.replaceState(null, '', '/connected.html');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    render(<ConnectedApp />);
    expect(await screen.findByText(/The page graph could not be loaded/)).toBeVisible();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(screen.queryByText('Welcome')).not.toBeInTheDocument();
    expect(screen.getByText(/Real data/)).toBeVisible();
    await waitFor(() => expect(screen.getByText(/Source revision: Not loaded/)).toBeVisible());
  });
  it('describes readiness and settings as unconnected, not as failed real checks or demo settings', async () => {
    window.history.replaceState(null, '', '/connected.html?workspace=readiness');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    render(<ConnectedApp />);
    expect(screen.getByRole('heading', { name: 'Readiness is not connected' })).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('link', { name: /^Settings$/ }));
    expect(within(screen.getByRole('main')).getByText(/The project is selected by private server configuration/)).toBeVisible();
    expect(screen.queryByText(/demonstration data is fixed/)).not.toBeInTheDocument();
  });
});
