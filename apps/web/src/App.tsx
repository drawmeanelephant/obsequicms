import type { ReactNode } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { TopNavHeading } from '@astryxdesign/core/TopNav';
import type { ObsequiousClient } from '@obsequious/contracts';
import { AppNavigation } from './shell/AppNavigation';
import { useWorkspaceRoute } from './shell/useWorkspaceRoute';
import { WorkspaceErrorBoundary } from './shell/WorkspaceErrorBoundary';
import { WorkspaceOutlet } from './shell/WorkspaceOutlet';

export type AppProps = {
  /**
   * The injected application client (docs/api.md#prototype-composition).
   * The entry creates it; a connected entry never imports demo scenarios.
   */
  client: ObsequiousClient;
  /**
   * Optional banner content rendered above the navigation (the demo entry
   * passes the persistent demo-data notice). App itself stays
   * demo-agnostic.
   */
  banner?: ReactNode;
};

/**
 * Application shell: persistent navigation for every destination, the
 * workspace router, and the workspace outlet. Unimplemented destinations
 * explain their limits instead of showing sample content.
 */
export default function App({ client, banner }: AppProps) {
  const { workspace, navigate, hrefFor } = useWorkspaceRoute();

  return (
    <AppShell
      height="fill"
      variant="section"
      contentPadding={0}
      banner={banner}
      topNav={
        <TopNav
          label="Application"
          heading={
            <TopNavHeading heading="Obsequious" headingHref={hrefFor('structure')} />
          }
        />
      }
      sideNav={
        <AppNavigation
          activeWorkspace={workspace}
          hrefFor={hrefFor}
          onNavigate={navigate}
        />
      }
    >
      <WorkspaceErrorBoundary key={workspace}>
        <WorkspaceOutlet client={client} workspace={workspace} />
      </WorkspaceErrorBoundary>
    </AppShell>
  );
}
