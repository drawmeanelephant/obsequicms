export type StructurePageProps = {
  /**
   * Which Structure view to open initially. Values are fixed by the
   * prototype composition contract (docs/api.md#prototype-composition).
   * P01 adds the `client` prop typed as the shared `ObsequiousClient`.
   */
  initialView?: 'outline' | 'inventory';
};

/**
 * Stable Structure feature placeholder. P03 implements the workspace.
 */
export function StructurePage({ initialView = 'outline' }: StructurePageProps) {
  return (
    <section aria-labelledby="structure-heading" data-view={initialView}>
      <h2 id="structure-heading">Structure</h2>
      <p>
        Not connected: this is a project-scaffold placeholder. It shows no
        pages and performs no requests.
      </p>
    </section>
  );
}

export default StructurePage;
