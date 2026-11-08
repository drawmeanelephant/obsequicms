import type { DemoScenarioRecord, ReadinessItemInput } from '../types';

/**
 * The `empty` scenario: a valid, current graph that contains no pages.
 * This is deliberately different from `unavailable` (no valid graph) and
 * `unsupported` (producer format not understood).
 */

const REVISION = '019a3c4e-7a10-7cc0-a1b2-c3d4e5f60002';

const manualSetup = (
  key: ReadinessItemInput['key'],
  label: string,
  category: ReadinessItemInput['category'],
): ReadinessItemInput => ({
  key,
  label,
  category,
  configuration: 'not_configured',
  generated: null,
  deployment: null,
  observation: { status: 'not_checked' },
  action: { kind: 'manual_setup', label, target: null },
});

export const emptyScenario: DemoScenarioRecord = {
  site: {
    name: 'Alder & Ivy Books (demo)',
    sourceRevision: REVISION,
    activeReleaseId: null,
  },

  pages: {
    sourceRevision: REVISION,
    graphRevision: REVISION,
    state: 'current',
    pages: [],
    dependencies: [],
    problems: [],
  },

  readiness: {
    sourceRevision: REVISION,
    releaseId: null,
    items: [
      manualSetup('robots', 'Create a robots.txt for the site', 'discovery'),
      manualSetup('sitemap', 'Enable sitemap generation', 'discovery'),
      manualSetup('canonical', 'Decide a canonical URL policy', 'discovery'),
      manualSetup('llms', 'Decide whether to publish llms.txt', 'discovery'),
      manualSetup('google_search_console', 'Verify site ownership in Search Console', 'discovery'),
      manualSetup('bing_webmaster', 'Verify site ownership in Bing Webmaster Tools', 'discovery'),
      manualSetup('social_preview', 'Provide social sharing metadata', 'identity'),
      manualSetup('humans', 'Describe the team in humans.txt', 'identity'),
      manualSetup('about', 'Write an About page', 'identity'),
      manualSetup('contact', 'Write a Contact page', 'identity'),
      manualSetup('analytics', 'Choose whether to connect analytics', 'measurement'),
      manualSetup('security_contact', 'Publish a security contact address', 'trust'),
      manualSetup('privacy', 'Publish a privacy policy', 'trust'),
      manualSetup('image_alt', 'Provide alt text guidance for future images', 'trust'),
    ],
  },

  sources: {},
};
