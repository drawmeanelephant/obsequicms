import type { ObsequiousClient } from '@obsequious/contracts';
import { ReadinessPage } from '../features/readiness/ReadinessPage';
import { StructurePage } from '../features/structure/StructurePage';
import { PlaceholderWorkspace } from './PlaceholderWorkspace';
import { type Workspace } from './workspaces';

export type WorkspaceOutletProps = {
  client: ObsequiousClient;
  workspace: Workspace;
};

/**
 * Maps the workspace destination to its feature. Pages opens the Structure
 * inventory; Structure opens the outline (docs/api.md#prototype-composition).
 * The shell remounts the feature when the workspace changes (the outlet is
 * keyed by workspace in App).
 */
export function WorkspaceOutlet({ client, workspace }: WorkspaceOutletProps) {
  switch (workspace) {
    case 'pages':
      return <StructurePage client={client} initialView="inventory" />;
    case 'structure':
      return <StructurePage client={client} initialView="outline" />;
    case 'readiness':
      return <ReadinessPage client={client} />;
    default:
      return <PlaceholderWorkspace workspace={workspace} />;
  }
}

export default WorkspaceOutlet;
