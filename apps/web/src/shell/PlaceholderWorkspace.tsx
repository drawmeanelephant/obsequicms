import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { workspaceLabel, workspaceLimit, type Workspace } from './workspaces';

/**
 * An honest placeholder for a destination that is not connected in this
 * prototype. It states what the area will do and what it cannot do now,
 * and it renders no misleading success action.
 */
export function PlaceholderWorkspace({ workspace }: { workspace: Workspace }) {
  return (
    <div className="workspace-page">
      <Heading level={1}>{workspaceLabel(workspace)}</Heading>
      <EmptyState
        title={`${workspaceLabel(workspace)} is not connected`}
        description={workspaceLimit(workspace)}
      />
      <Text type="supporting" color="secondary" as="p">
        This prototype demonstrates the Structure and Readiness workspaces.
        Other destinations stay listed so the product navigation is complete,
        and they say so instead of showing sample content.
      </Text>
    </div>
  );
}

export default PlaceholderWorkspace;
