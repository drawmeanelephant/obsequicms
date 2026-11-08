import { ReadinessPage } from './features/readiness/ReadinessPage';
import { StructurePage } from './features/structure/StructurePage';

/**
 * Project-scaffold application shell. P02 replaces this with the Astryx
 * application shell, persistent navigation, and the injected
 * `ObsequiousClient` (docs/api.md#prototype-composition).
 */
export default function App() {
  return (
    <main id="main">
      <h1>Obsequious</h1>
      <p data-testid="prototype-label">
        Prototype (M0) — demo data only. Not connected to a server or compiler.
      </p>
      <StructurePage initialView="outline" />
      <ReadinessPage />
    </main>
  );
}
