import type { ObsequiousClient } from '@obsequious/contracts';

export type ReadinessPageProps = {
  /**
   * The injected application client (docs/api.md#prototype-composition).
   * Failures reject with the shared `ApiError`; the page never substitutes
   * demo data for a failed request.
   */
  client: ObsequiousClient;
};

/**
 * Stable Site Readiness feature placeholder. P04 implements the workspace.
 */
export function ReadinessPage(_props: ReadinessPageProps) {
  return (
    <section aria-labelledby="readiness-heading">
      <h2 id="readiness-heading">Site readiness</h2>
      <p>
        Not connected: this is a project-scaffold placeholder. It shows no
        readiness items and performs no requests.
      </p>
    </section>
  );
}

export default ReadinessPage;
