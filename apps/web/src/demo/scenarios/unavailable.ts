import type { DemoScenarioRecord, ReadinessItemInput } from '../types';

/**
 * The `unavailable` scenario: source exists, but no valid graph does. The
 * last compiler run failed, so the index presents no pages, no
 * dependencies, and no graph revision — only an explanation.
 */

const REVISION = '019a3c4e-7a10-7cc0-a1b2-c3d4e5f60004';

export const unavailableScenario: DemoScenarioRecord = {
  site: {
    name: 'Alder & Ivy Books (demo)',
    sourceRevision: REVISION,
    activeReleaseId: null,
  },

  pages: {
    sourceRevision: REVISION,
    graphRevision: null,
    state: 'unavailable',
    pages: [],
    dependencies: [],
    problems: [
      {
        severity: 'error',
        code: null,
        message: 'The last compiler run failed; no valid graph is available (demo scenario).',
        sourcePath: null,
        line: null,
        column: null,
        origin: 'process',
      },
    ],
  },

  readiness: {
    sourceRevision: REVISION,
    releaseId: null,
    items: [
      {
        // The check cannot run while no valid graph exists.
        key: 'robots',
        label: 'robots.txt',
        category: 'discovery',
        configuration: 'configured',
        generated: null,
        deployment: null,
        observation: {
          status: 'error',
          code: 'no_graph',
          message: 'The readiness check cannot run while no valid graph exists (demo scenario).',
        },
        action: { kind: 'run_check', label: 'Retry once a graph is available', target: null },
      },
      ...(
        [
          ['sitemap', 'Enable sitemap generation', 'discovery'],
          ['canonical', 'Decide a canonical URL policy', 'discovery'],
          ['social_preview', 'Provide social sharing metadata', 'identity'],
          ['llms', 'Decide whether to publish llms.txt', 'discovery'],
          ['humans', 'Describe the team in humans.txt', 'identity'],
          ['security_contact', 'Publish a security contact address', 'trust'],
          ['about', 'Write an About page', 'identity'],
          ['contact', 'Write a Contact page', 'identity'],
          ['privacy', 'Publish a privacy policy', 'trust'],
          ['google_search_console', 'Verify site ownership in Search Console', 'discovery'],
          ['bing_webmaster', 'Verify site ownership in Bing Webmaster Tools', 'discovery'],
          ['analytics', 'Choose whether to connect analytics', 'measurement'],
          ['image_alt', 'Provide alt text guidance for future images', 'trust'],
        ] as const
      ).map(([key, label, category]): ReadinessItemInput => ({
        key,
        label,
        category,
        configuration: 'not_configured',
        generated: null,
        deployment: null,
        observation: { status: 'not_checked' },
        action: { kind: 'manual_setup', label, target: null },
      })),
    ],
  },

  sources: {},
};
