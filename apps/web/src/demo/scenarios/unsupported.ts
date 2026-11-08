import type { DemoScenarioRecord, ReadinessItemInput } from '../types';

/**
 * The `unsupported` scenario: the producer artifact format is not
 * understood by this prototype. This is a distinct situation from an
 * empty site and from a missing graph, and no graph may be presented as
 * valid.
 */

const REVISION = '019a3c4e-7a10-7cc0-a1b2-c3d4e5f60005';

export const unsupportedScenario: DemoScenarioRecord = {
  site: {
    name: 'Alder & Ivy Books (demo)',
    sourceRevision: REVISION,
    activeReleaseId: null,
  },

  pages: {
    sourceRevision: REVISION,
    graphRevision: null,
    state: 'unsupported',
    pages: [],
    dependencies: [],
    problems: [
      {
        severity: 'error',
        code: null,
        message:
          'The producer artifact format is not supported by this prototype; no graph is presented (demo scenario).',
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
    items: (
      [
        ['robots', 'Create a robots.txt for the site', 'discovery'],
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
  },

  sources: {},
};
