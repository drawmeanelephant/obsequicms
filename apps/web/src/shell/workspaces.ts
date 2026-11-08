/**
 * Workspace declarations and the query-parameter interface
 * (docs/api.md#prototype-composition).
 *
 * The demo uses `workspace` and `scenario` query parameters. Pages opens
 * the Structure inventory; Structure opens the outline. Both default to
 * Structure with populated data. Navigation preserves the selected
 * scenario.
 */

export const WORKSPACES = [
  'pages',
  'structure',
  'editor',
  'media',
  'readiness',
  'analytics',
  'publish',
  'settings',
] as const;

export type Workspace = (typeof WORKSPACES)[number];

export const DEFAULT_WORKSPACE: Workspace = 'structure';

const WORKSPACE_LABELS: Record<Workspace, string> = {
  pages: 'Pages',
  structure: 'Structure',
  editor: 'Editor',
  media: 'Media',
  readiness: 'Readiness',
  analytics: 'Analytics',
  publish: 'Publish',
  settings: 'Settings',
};

/** One-line statement of what this destination can and cannot do yet. */
const WORKSPACE_LIMITS: Record<Workspace, string> = {
  pages: 'Opens the Structure workspace in inventory view.',
  structure: 'Opens the Structure workspace in outline view.',
  editor:
    'Source editing connects to real storage and compiler validation in a later milestone. Nothing can be saved here.',
  media:
    'Media upload, variants, and usage inspection are not connected. No files can be added or removed here.',
  readiness: 'Opens the Site Readiness workspace.',
  analytics:
    'Analytics connections arrive in a later milestone with an explicit provider choice. No traffic metrics are shown or invented here.',
  publish:
    'Publishing is not connected. No build, release, or deployment can be started from this prototype.',
  settings:
    'Site settings are not connected. The demonstration data is fixed by the selected demo scenario.',
};

export function workspaceLabel(workspace: Workspace): string {
  return WORKSPACE_LABELS[workspace];
}

export function workspaceLimit(workspace: Workspace): string {
  return WORKSPACE_LIMITS[workspace];
}

export function parseWorkspace(search: string): Workspace {
  const value = new URLSearchParams(search).get('workspace');
  if (value !== null && (WORKSPACES as readonly string[]).includes(value)) {
    return value as Workspace;
  }
  return DEFAULT_WORKSPACE;
}

export function parseScenarioParam(search: string): string {
  return new URLSearchParams(search).get('scenario') ?? 'populated';
}

/**
 * Builds a workspace URL that preserves the scenario query parameter.
 * Unknown scenario values are dropped; the demo entry then falls back to
 * its default.
 */
export function buildWorkspaceHref(
  workspace: Workspace,
  scenario: string | null,
): string {
  const params = new URLSearchParams();
  params.set('workspace', workspace);
  if (scenario) {
    params.set('scenario', scenario);
  }
  return `?${params.toString()}`;
}
