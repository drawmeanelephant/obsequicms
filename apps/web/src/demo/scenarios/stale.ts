import type { DemoScenarioRecord, ReadinessItemInput } from '../types';

/**
 * The `stale` scenario: the source revision moved ahead of the last valid
 * compiler graph. The pages shown come from the earlier graph; consumers
 * must label the data with both revisions. No release exists, so the
 * readiness pass below (produced for the older graph revision) is stale
 * against the displayed source revision.
 */

const CURRENT_REVISION = '019a3c4e-7a10-7cc0-a1b2-c3d4e5f60003';
const GRAPH_REVISION = '019a3c20-9b80-7cc0-a1b2-c3d4e5f60300';
const EVIDENCE = {
  robotsGen: '019a3c51-0001-7cc0-a1b2-c3d4e5f60001',
  robotsObs: '019a3c51-0002-7cc0-a1b2-c3d4e5f60002',
} as const;

export const staleScenario: DemoScenarioRecord = {
  site: {
    name: 'Alder & Ivy Books (demo)',
    sourceRevision: CURRENT_REVISION,
    activeReleaseId: null,
  },

  pages: {
    sourceRevision: CURRENT_REVISION,
    graphRevision: GRAPH_REVISION,
    state: 'stale',
    pages: [
      {
        entityId: 'ent-home',
        title: 'Welcome',
        sourcePath: 'content/index.md',
        parentId: null,
        role: 'trunk',
        status: 'published',
        tags: ['front'],
        publishedUrl: null,
      },
      {
        entityId: 'ent-guides',
        title: 'Field guides',
        sourcePath: 'content/guides/index.md',
        parentId: null,
        role: 'trunk',
        status: 'published',
        tags: ['section'],
        publishedUrl: null,
      },
      {
        entityId: 'ent-ferns',
        title: 'Ferns of the valley',
        sourcePath: 'content/guides/ferns.md',
        parentId: 'ent-guides',
        role: 'satellite',
        status: 'published',
        tags: ['plants'],
        publishedUrl: null,
      },
      {
        entityId: 'ent-about',
        title: 'About the nursery',
        sourcePath: 'content/company/about.md',
        parentId: 'ent-home',
        role: 'satellite',
        status: 'published',
        tags: ['company'],
        publishedUrl: null,
      },
    ],
    dependencies: [
      { kind: 'parent', from: { type: 'page', entityId: 'ent-ferns' }, to: { type: 'page', entityId: 'ent-guides' } },
      { kind: 'parent', from: { type: 'page', entityId: 'ent-about' }, to: { type: 'page', entityId: 'ent-home' } },
    ],
    problems: [],
  },

  readiness: {
    sourceRevision: CURRENT_REVISION,
    releaseId: null,
    items: [
      {
        // A passing observation for the older graph revision: stale for
        // the displayed source revision.
        key: 'robots',
        label: 'robots.txt',
        category: 'discovery',
        configuration: 'configured',
        generated: { sourceRevision: GRAPH_REVISION, evidenceId: EVIDENCE.robotsGen },
        deployment: null,
        observation: {
          status: 'complete',
          verdict: 'passed',
          evidenceId: EVIDENCE.robotsObs,
          method: 'compiler',
          observedAt: '2026-10-15T09:00:00Z',
          subject: { sourceRevision: GRAPH_REVISION, releaseId: null, url: null },
        },
        action: { kind: 'run_check', label: 'Re-check against the current revision', target: null },
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

  sources: {
    'content/index.md': [
      '# Welcome',
      '',
      'The welcome page as of the last valid graph. Newer source edits',
      'are not reflected in this stale view.',
      '',
    ].join('\n'),
    'content/guides/index.md': [
      '# Field guides',
      '',
      'The guides index as of the last valid graph.',
      '',
    ].join('\n'),
    'content/guides/ferns.md': [
      '# Ferns of the valley',
      '',
      'The fern guide as of the last valid graph.',
      '',
    ].join('\n'),
    'content/company/about.md': [
      '# About the nursery',
      '',
      'The about page as of the last valid graph.',
      '',
    ].join('\n'),
  },
};
