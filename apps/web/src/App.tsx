import type { ObsequiousClient } from '@obsequious/contracts';
import { ReadinessPage } from './features/readiness/ReadinessPage';
import { StructurePage } from './features/structure/StructurePage';

export type AppProps = {
  client: ObsequiousClient;
};

/**
 * Project-scaffold application shell. P02 replaces this with the Astryx
 * application shell, persistent navigation, and the query-parameter
 * composition contract (docs/api.md#prototype-composition).
 */
export default function App({ client }: AppProps) {
  return (
    <main id="main">
      <h1>Obsequious</h1>
      <p data-testid="prototype-label">
        Prototype (M0) — demo data only. Not connected to a server or compiler.
      </p>
      <StructurePage client={client} initialView="outline" />
      <ReadinessPage client={client} />
    </main>
  );
}
