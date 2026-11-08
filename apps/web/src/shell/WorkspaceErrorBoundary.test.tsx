import { render, screen } from '@testing-library/react';
import { ApiError } from '@obsequious/contracts';
import { WorkspaceErrorBoundary } from './WorkspaceErrorBoundary';

function ThrowingChild({ error }: { error: unknown }): React.JSX.Element {
  throw error;
}

describe('WorkspaceErrorBoundary', () => {
  const silenceConsole = () => {
    const original = console.error;
    console.error = () => {};
    return () => {
      console.error = original;
    };
  };

  it('renders children until a workspace throws', () => {
    render(
      <WorkspaceErrorBoundary>
        <p>workspace content</p>
      </WorkspaceErrorBoundary>,
    );
    expect(screen.getByText('workspace content')).toBeVisible();
  });

  it('renders an explicit error state for typed API errors without demo data', () => {
    const restore = silenceConsole();
    try {
      render(
        <WorkspaceErrorBoundary>
          <ThrowingChild
            error={new ApiError('unavailable', 'network unreachable', 'req-9')}
          />
        </WorkspaceErrorBoundary>,
      );

      expect(
        screen.getByRole('heading', { name: 'This workspace could not load' }),
      ).toBeVisible();
      expect(
        screen.getByText(/The data source returned unavailable: network unreachable/),
      ).toBeVisible();
      expect(screen.queryByText('workspace content')).not.toBeInTheDocument();
      expect(screen.queryByText(/sample data/i)).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it('renders a generic explanation for unexpected errors', () => {
    const restore = silenceConsole();
    try {
      render(
        <WorkspaceErrorBoundary>
          <ThrowingChild error={new Error('boom')} />
        </WorkspaceErrorBoundary>,
      );
      expect(screen.getByText(/unexpected error/)).toBeVisible();
    } finally {
      restore();
    }
  });
});
