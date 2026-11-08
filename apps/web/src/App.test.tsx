import { render, screen } from '@testing-library/react';
import App from './App';
import { createDemoClient } from './demo';

describe('App (project scaffold)', () => {
  it('shows the Obsequious heading and an explicit prototype label', () => {
    render(<App client={createDemoClient('populated')} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Obsequious' }),
    ).toBeVisible();
    expect(screen.getByTestId('prototype-label')).toHaveTextContent(
      /demo data/i,
    );
    expect(screen.getByTestId('prototype-label')).toHaveTextContent(
      /not connected/i,
    );
  });

  it('marks both feature placeholders as not connected', () => {
    render(<App client={createDemoClient('populated')} />);

    expect(
      screen.getByRole('heading', { name: 'Structure' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Site readiness' }),
    ).toBeVisible();
    expect(screen.getAllByText(/^Not connected:/)).toHaveLength(2);
  });
});
