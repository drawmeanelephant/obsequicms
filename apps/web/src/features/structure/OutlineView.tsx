import { TreeList, type TreeListItemData } from '@astryxdesign/core/TreeList';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { FileText } from 'lucide-react';
import type { PageSummary } from '@obsequious/contracts';
import type { OutlineNode } from './outline';
import { StatusBadge } from './StatusBadge';

export type OutlineViewProps = {
  nodes: OutlineNode[];
  detached: PageSummary[];
  selectedEntityId: string | null;
  onSelect: (entityId: string) => void;
};

function toTreeItems(
  nodes: OutlineNode[],
  selectedEntityId: string | null,
  onSelect: (entityId: string) => void,
): TreeListItemData[] {
  return nodes.map((node) => ({
    id: node.page.entityId,
    label: node.page.title,
    description: node.page.sourcePath,
    startContent: <FileText size={14} aria-hidden="true" />,
    endContent: <StatusBadge status={node.page.status} />,
    isSelected: node.page.entityId === selectedEntityId,
    isExpanded: true,
    onClick: () => onSelect(node.page.entityId),
    children: toTreeItems(node.children, selectedEntityId, onSelect),
  }));
}

/**
 * The outline view: nested parentage rendered from validated summaries.
 * Both root trees and the full deep chain stay visible; expansion starts
 * open so nothing hides behind a collapsed branch by default.
 */
export function OutlineView({
  nodes,
  detached,
  selectedEntityId,
  onSelect,
}: OutlineViewProps) {
  if (nodes.length === 0 && detached.length === 0) {
    return (
      <EmptyState
        title="No pages match the current search and filters"
        headingLevel={3}
      />
    );
  }

  return (
    <div>
      <TreeList
        header={
          <Heading level={2} id="outline-heading">
            Outline
          </Heading>
        }
        items={toTreeItems(nodes, selectedEntityId, onSelect)}
        density="balanced"
      />
      {detached.length > 0 ? (
        <section aria-labelledby="detached-heading">
          <Heading level={3} id="detached-heading">
            Pages without a resolvable parent
          </Heading>
          <TreeList
            aria-label="Pages without a resolvable parent"
            items={detached.map((page) => ({
              id: page.entityId,
              label: page.title,
              description: page.sourcePath,
              isSelected: page.entityId === selectedEntityId,
              isExpanded: true,
              onClick: () => onSelect(page.entityId),
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}

export default OutlineView;
