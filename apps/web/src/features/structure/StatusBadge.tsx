import { Badge } from '@astryxdesign/core/Badge';
import type { PageStatus } from '@obsequious/contracts';

const STATUS_LABELS: Record<'draft' | 'published' | 'archived', string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

/**
 * Renders an authored status. An unset status is shown as its own explicit
 * value ("Unset") rather than disguised as a success or empty state.
 */
export function StatusBadge({ status }: { status: PageStatus | null }) {
  if (status === null) {
    return (
      <Badge variant="neutral" label="Unset" />
    );
  }
  const variant =
    status === 'published'
      ? 'success'
      : status === 'draft'
        ? 'warning'
        : 'neutral';
  return <Badge variant={variant} label={STATUS_LABELS[status]} />;
}

export default StatusBadge;
