import { useMemo, useState } from 'react';
import App from '../App';
import { createConnectedClient } from './client';

export function ConnectedApp() {
  const [revision, setRevision] = useState<string | null>(null);
  const client = useMemo(() => createConnectedClient({
    onIndex: index => setRevision(index?.sourceRevision ?? null),
  }), []);
  return (
    <App
      client={client}
      banner={
        <div className="demo-banner" role="region" aria-label="Real project data">
          <strong>Real data · read-only M1</strong>
          <span className="demo-banner-note">
            Source revision: {revision ?? 'Not loaded — awaiting the private backend.'}
          </span>
          <span className="demo-banner-note">
            One operator-selected project. No saving, preview, readiness checks, or publishing.
          </span>
        </div>
      }
    />
  );
}
