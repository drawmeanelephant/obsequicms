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
 * Persistent application navigation. Every destination stays reachable by
 * keyboard; the active destination carries aria-current="page" through
 * SideNavItem's isSelected.
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
