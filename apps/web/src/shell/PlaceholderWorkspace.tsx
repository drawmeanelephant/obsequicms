import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import type { ClientMode } from '@obsequious/contracts';
import { workspaceLabel, workspaceLimit, type Workspace } from './workspaces';

/**
 * An honest placeholder for a destination that is not connected in this
 * prototype. It states what the area will do and what it cannot do now,
 * and it renders no misleading success action.
 */
export function PlaceholderWorkspace({
  workspace, mode = 'demo',
}: { workspace: Workspace; mode?: ClientMode }) {
  const connected = mode === 'connected';
  const limit = connected && workspace === 'readiness'
    ? 'Readiness is not connected in read-only M1. No readiness checks have run.'
    : connected && workspace === 'settings'
      ? 'The project is selected by private server configuration. Browser project selection and settings changes are not implemented.'
      : workspaceLimit(workspace);
  return (
    <div className="workspace-page">
      <Heading level={1}>{workspaceLabel(workspace)}</Heading>
      <EmptyState
        title={`${workspaceLabel(workspace)} is not connected`}
        description={limit}
      />
      <Text type="supporting" color="secondary" as="p">
        {connected
          ? 'Read-only M1 connects Pages and Structure to one real Boris project. Other destinations are not connected; no sample content or successful actions are substituted.'
          : 'This prototype demonstrates the Structure and Readiness workspaces. Other destinations stay listed so the product navigation is complete, and they say so instead of showing sample content.'}
      </Text>
    </div>
  );
}

export default PlaceholderWorkspace;
