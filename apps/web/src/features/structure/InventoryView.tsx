import { Table, proportional } from '@astryxdesign/core/Table';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import type { PageSummary } from '@obsequious/contracts';
import { StatusBadge } from './StatusBadge';

export type InventoryViewProps = {
  pages: PageSummary[];
  selectedEntityId: string | null;
  onSelect: (entityId: string) => void;
};

type InventoryRow = PageSummary & Record<string, unknown>;

/**
 * The inventory view: a flat, filterable list of pages. Rows select pages;
 * nothing in this table saves or mutates anything.
 */
export function InventoryView({
  pages,
  selectedEntityId,
  onSelect,
}: InventoryViewProps) {
  if (pages.length === 0) {
    return (
      <EmptyState
        title="No pages match the current search and filters"
        description="Clear the search or filters to see the full inventory."
        headingLevel={3}
      />
    );
  }

  const rows: InventoryRow[] = pages;

  return (
    <div>
      <Heading level={2}>Inventory</Heading>
      <Table<InventoryRow>
        data={rows}
        idKey={(row) => row.entityId}
        density="compact"
        dividers="rows"
        hasHover
        columns={[
          {
            key: 'title',
            header: 'Title',
            width: proportional(2),
            renderCell: (row) => (
              <Button
                variant="ghost"
                size="sm"
                label={row.title}
                onClick={() => onSelect(row.entityId)}
                data-selected={row.entityId === selectedEntityId || undefined}
              />
            ),
          },
          {
            key: 'status',
            header: 'Status',
            width: proportional(1),
            renderCell: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: 'tags',
            header: 'Tags',
            width: proportional(1),
            renderCell: (row) =>
              row.tags.length > 0 ? (
                <Text type="supporting">{row.tags.join(', ')}</Text>
              ) : (
                <Text type="supporting" color="disabled">
                  —
                </Text>
              ),
          },
          {
            key: 'sourcePath',
            header: 'Source path',
            width: proportional(2),
            renderCell: (row) => (
              <Text type="code">{row.sourcePath}</Text>
            ),
          },
          {
            key: 'publishedUrl',
            header: 'Published URL',
            width: proportional(2),
            renderCell: (row) =>
              row.publishedUrl ? (
                <Text type="supporting">{row.publishedUrl}</Text>
              ) : (
                <Text type="supporting" color="disabled">
                  Unknown — no release mapping
                </Text>
              ),
          },
        ]}
      />
      <p>
        {pages.length} of the pages are listed. Select a page to open its
        inspector.
      </p>
    </div>
  );
}

export default InventoryView;
