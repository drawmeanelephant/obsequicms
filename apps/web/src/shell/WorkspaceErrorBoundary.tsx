import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Heading } from '@astryxdesign/core/Heading';
import { isApiError } from '@obsequious/contracts';

type Props = { children: ReactNode };
type State = { error: unknown | null };

/**
 * Catch-all for workspace rendering failures. A typed request error must
 * neither blank the screen nor fall back to demo data: this boundary
 * renders an explicit error state and keeps the navigation usable.
 */
export class WorkspaceErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  override componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // Surfaces through the rendered error state; no telemetry exists in
    // the prototype.
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error !== null) {
      const detail = isApiError(error)
        ? `The data source returned ${error.code}: ${error.message}`
        : 'The workspace failed with an unexpected error. No fallback data is shown.';
      return (
        <div className="workspace-page">
          <Heading level={1}>This workspace could not load</Heading>
          <Banner
            status="error"
            title="Nothing is displayed rather than showing incomplete data"
            description={detail}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default WorkspaceErrorBoundary;
