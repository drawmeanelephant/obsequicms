import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { navigateTo } from '../shell/fullNavigation';
import { DemoScenarioBanner } from './DemoScenarioBanner';

vi.mock('../shell/fullNavigation', () => ({
  navigateTo: vi.fn(),
}));

describe('DemoScenarioBanner', () => {
  it('renders the persistent demo-data label with the active scenario', () => {
    render(<DemoScenarioBanner scenario="populated" />);

    expect(screen.getByText('Demo data')).toBeVisible();
    expect(
      screen.getByText(/nothing here is live, saved, or verified/i),
    ).toBeVisible();
    const select = screen.getByRole('combobox', { name: 'Demo scenario' });
    expect(select).toHaveValue('populated');
    expect(select).toBeEnabled();
  });

  it('offers all six named scenarios', () => {
    render(<DemoScenarioBanner scenario="stale" />);

    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Populated site',
      'Empty site',
      'Stale graph',
      'Graph unavailable',
      'Unsupported producer',
      'Request error',
    ]);
    expect(screen.getByRole('combobox', { name: 'Demo scenario' })).toHaveValue(
      'stale',
    );
  });

  it('performs a full navigation when the scenario changes', async () => {
    const user = userEvent.setup();
    window.history.pushState(null, '', '?workspace=readiness&scenario=populated');
    const navigateMock = vi.mocked(navigateTo);
    navigateMock.mockClear();
    try {
      render(<DemoScenarioBanner scenario="populated" />);
      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Demo scenario' }),
        'request-error',
      );
      expect(navigateMock).toHaveBeenCalledWith(
        '?workspace=readiness&scenario=request-error',
      );
    } finally {
      navigateMock.mockReset();
    }
  });
});
