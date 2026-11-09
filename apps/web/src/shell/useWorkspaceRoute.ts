import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClientMode } from '@obsequious/contracts';
import {
  buildWorkspaceHref,
  parseScenarioParam,
  parseWorkspace,
  type Workspace,
} from './workspaces';

export type WorkspaceRoute = {
  workspace: Workspace;
  scenario: string | null;
  /** Client-side navigation to a workspace, preserving the scenario. */
  navigate: (workspace: Workspace) => void;
  /** Href for a workspace link, preserving the scenario. */
  hrefFor: (workspace: Workspace) => string;
};

function readRoute(mode: ClientMode): { workspace: Workspace; scenario: string | null } {
  const search = window.location.search;
  return {
    workspace: parseWorkspace(search),
    scenario: mode === 'demo' ? parseScenarioParam(search) || null : null,
  };
}

/**
 * Small query-parameter router for the workspace destination. Real anchors
 * keep middle-click and keyboard behavior; clicks are intercepted into
 * pushState so switching workspaces does not reload the application or
 * recreate the injected client. Back and forward follow popstate.
 */
export function useWorkspaceRoute(mode: ClientMode = 'demo'): WorkspaceRoute {
  const [route, setRoute] = useState(() => readRoute(mode));

  useEffect(() => {
    const onPopState = () => {
      setRoute(readRoute(mode));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [mode]);

  const navigate = useCallback((workspace: Workspace) => {
    const href = buildWorkspaceHref(workspace, mode === 'demo' ? parseScenarioParam(window.location.search) : null);
    if (href === `${window.location.pathname}${window.location.search}`) {
      return;
    }
    window.history.pushState(null, '', href);
    setRoute(readRoute(mode));
  }, [mode]);

  const hrefFor = useCallback(
    (workspace: Workspace) => buildWorkspaceHref(workspace, route.scenario),
    [route.scenario],
  );

  return useMemo(
    () => ({ ...route, navigate, hrefFor }),
    [route, navigate, hrefFor],
  );
}
