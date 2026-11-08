import {
  SideNav,
  SideNavItem,
  SideNavSection,
  type SideNavProps,
} from '@astryxdesign/core/SideNav';
import {
  FileText,
  Image as ImageIcon,
  ListTree,
  PencilLine,
  Settings as SettingsIcon,
  ShieldCheck,
  BarChart3,
  Rocket,
} from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { workspaceLabel, type Workspace } from './workspaces';

export type AppNavigationProps = {
  activeWorkspace: Workspace;
  hrefFor: (workspace: Workspace) => string;
  onNavigate: (workspace: Workspace) => void;
  /**
   * Extra footer content (demo chrome renders the scenario control here in
   * the demo entry composition).
   */
  footer?: SideNavProps['footer'];
};

type Destination = {
  workspace: Workspace;
  icon: typeof FileText;
};

const CONTENT_DESTINATIONS: Destination[] = [
  { workspace: 'pages', icon: FileText },
  { workspace: 'structure', icon: ListTree },
  { workspace: 'editor', icon: PencilLine },
  { workspace: 'media', icon: ImageIcon },
];

const SITE_DESTINATIONS: Destination[] = [
  { workspace: 'readiness', icon: ShieldCheck },
  { workspace: 'analytics', icon: BarChart3 },
  { workspace: 'publish', icon: Rocket },
];

const WORKSPACE_DESTINATIONS: Destination[] = [
  { workspace: 'settings', icon: SettingsIcon },
];

/**
 * Whether this activation is an ordinary, unmodified primary activation:
 * a plain click or a keyboard activation (Enter/Space, which arrive as
 * button 0 without modifiers). Modified activations — Cmd/Ctrl-click for a
 * new tab, Shift-click for a new window, Alt-click downloads — and other
 * buttons belong to the browser and keep the native anchor behavior.
 */
function isPlainPrimaryActivation(event: ReactMouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * Persistent application navigation. Every destination stays reachable by
 * keyboard; the active destination carries aria-current="page" through
 * SideNavItem's isSelected. Real hrefs stay on every item, so unmodified
 * clicks pushState through the router while modified clicks keep native
 * browser navigation.
 */
export function AppNavigation({
  activeWorkspace,
  hrefFor,
  onNavigate,
  footer,
}: AppNavigationProps) {
  const renderSection = (
    title: string,
    destinations: Destination[],
  ) => (
    <SideNavSection title={title}>
      {destinations.map(({ workspace, icon }) => (
        <SideNavItem
          key={workspace}
          label={workspaceLabel(workspace)}
          icon={icon}
          href={hrefFor(workspace)}
          isSelected={workspace === activeWorkspace}
          onClick={(event) => {
            if (!isPlainPrimaryActivation(event)) {
              return;
            }
            event.preventDefault();
            onNavigate(workspace);
          }}
        />
      ))}
    </SideNavSection>
  );

  return (
    <SideNav aria-label="Main" footer={footer}>
      {renderSection('Content', CONTENT_DESTINATIONS)}
      {renderSection('Site', SITE_DESTINATIONS)}
      {renderSection('Workspace', WORKSPACE_DESTINATIONS)}
    </SideNav>
  );
}

export default AppNavigation;
