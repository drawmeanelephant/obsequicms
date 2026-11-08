import type { DemoScenarioRecord } from '../types';

/**
 * The `populated` scenario.
 *
 * All identifiers, timestamps, and the release below are synthetic demo
 * values. The fixture explicitly describes a simulated release
 * (RELEASE) so that a small set of pages carries a `publishedUrl`; every
 * other page keeps an unknown published URL (null). Nothing here is a
 * compiler capture or a real verification result.
 */

const REVISION = '019a3c4e-7a10-7cc0-a1b2-c3d4e5f60001';
/** Simulated active release described by this fixture. */
const RELEASE = '019a3c4e-7a10-7cc0-a1b2-c3d4e5f60a01';
/** Simulated earlier release, kept for stale-evidence examples. */
const OLDER_RELEASE = '019a2f10-3e50-7cc0-a1b2-c3d4e5f60900';

const EVIDENCE = {
  sitemap: '019a3c50-0001-7cc0-a1b2-c3d4e5f60001',
  canonicalGen: '019a3c50-0002-7cc0-a1b2-c3d4e5f60002',
  canonicalDep: '019a3c50-0003-7cc0-a1b2-c3d4e5f60003',
  canonicalObs: '019a3c50-0004-7cc0-a1b2-c3d4e5f60004',
  socialGen: '019a3c50-0005-7cc0-a1b2-c3d4e5f60005',
  socialDep: '019a3c50-0006-7cc0-a1b2-c3d4e5f60006',
  socialObs: '019a3c50-0007-7cc0-a1b2-c3d4e5f60007',
  llmsObs: '019a3c50-0008-7cc0-a1b2-c3d4e5f60008',
  securityGen: '019a3c50-0009-7cc0-a1b2-c3d4e5f60009',
  securityDep: '019a3c50-000a-7cc0-a1b2-c3d4e5f6000a',
  aboutDep: '019a3c50-000b-7cc0-a1b2-c3d4e5f6000b',
  aboutObs: '019a3c50-000c-7cc0-a1b2-c3d4e5f6000c',
  contactDep: '019a3c50-000d-7cc0-a1b2-c3d4e5f6000d',
  contactObs: '019a3c50-000e-7cc0-a1b2-c3d4e5f6000e',
  altObs: '019a3c50-000f-7cc0-a1b2-c3d4e5f6000f',
} as const;

export const populatedScenario: DemoScenarioRecord = {
  site: {
    name: 'Alder & Ivy Books (demo)',
    sourceRevision: REVISION,
    activeReleaseId: RELEASE,
  },

  pages: {
    sourceRevision: REVISION,
    graphRevision: REVISION,
    state: 'current',
    pages: [
      {
        entityId: 'ent-home',
        title: 'Welcome',
        sourcePath: 'content/index.md',
        parentId: null,
        role: 'trunk',
        status: 'published',
        tags: ['front'],
        publishedUrl: 'https://alder-ivy.example/',
      },
      {
        entityId: 'ent-guides',
        title: 'Field guides',
        sourcePath: 'content/guides/index.md',
        parentId: null,
        role: 'trunk',
        status: 'published',
        tags: ['section'],
        publishedUrl: 'https://alder-ivy.example/guides',
      },
      {
        entityId: 'ent-ferns',
        title: 'Ferns of the valley',
        sourcePath: 'content/guides/ferns.md',
        parentId: 'ent-guides',
        role: 'satellite',
        status: 'published',
        tags: ['plants'],
        publishedUrl: 'https://alder-ivy.example/guides/ferns',
      },
      {
        // Source folder (content/plant-care/) differs from the page's
        // parentage: its parent lives in content/guides/.
        entityId: 'ent-fern-care',
        title: 'Caring for ferns',
        sourcePath: 'content/plant-care/ferns.md',
        parentId: 'ent-ferns',
        role: 'satellite',
        status: 'draft',
        tags: ['plants', 'care'],
        publishedUrl: null,
      },
      {
        entityId: 'ent-fern-seasons',
        title: 'Seasonal fern care',
        sourcePath: 'content/plant-care/ferns-seasons.md',
        parentId: 'ent-fern-care',
        role: 'satellite',
        status: null,
        tags: ['plants', 'care'],
        publishedUrl: null,
      },
      {
        entityId: 'ent-mosses',
        title: 'Mosses of the shaded paths',
        sourcePath: 'content/guides/mosses.md',
        parentId: 'ent-guides',
        role: 'satellite',
        status: 'archived',
        tags: ['plants', 'shade'],
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
      {
        entityId: 'ent-contact',
        title: 'Contact',
        sourcePath: 'content/company/contact.md',
        parentId: 'ent-about',
        role: 'satellite',
        status: 'published',
        tags: ['company'],
        publishedUrl: null,
      },
      {
        // content/legal/ holds two root-level siblings of Welcome. A
        // folder name resembling a section must not acquire parentage:
        // privacy is a sibling of terms, not its child.
        entityId: 'ent-terms',
        title: 'Terms of sale',
        sourcePath: 'content/legal/terms.md',
        parentId: 'ent-home',
        role: 'satellite',
        status: null,
        tags: ['legal'],
        publishedUrl: null,
      },
      {
        entityId: 'ent-privacy',
        title: 'Privacy',
        sourcePath: 'content/legal/privacy.md',
        parentId: 'ent-home',
        role: 'satellite',
        status: 'published',
        tags: ['legal'],
        publishedUrl: null,
      },
    ],
    dependencies: [
      { kind: 'parent', from: { type: 'page', entityId: 'ent-ferns' }, to: { type: 'page', entityId: 'ent-guides' } },
      { kind: 'parent', from: { type: 'page', entityId: 'ent-fern-care' }, to: { type: 'page', entityId: 'ent-ferns' } },
      { kind: 'parent', from: { type: 'page', entityId: 'ent-fern-seasons' }, to: { type: 'page', entityId: 'ent-fern-care' } },
      { kind: 'parent', from: { type: 'page', entityId: 'ent-mosses' }, to: { type: 'page', entityId: 'ent-guides' } },
      { kind: 'parent', from: { type: 'page', entityId: 'ent-about' }, to: { type: 'page', entityId: 'ent-home' } },
      { kind: 'parent', from: { type: 'page', entityId: 'ent-contact' }, to: { type: 'page', entityId: 'ent-about' } },
      { kind: 'parent', from: { type: 'page', entityId: 'ent-terms' }, to: { type: 'page', entityId: 'ent-home' } },
      { kind: 'parent', from: { type: 'page', entityId: 'ent-privacy' }, to: { type: 'page', entityId: 'ent-home' } },
      { kind: 'reference', from: { type: 'page', entityId: 'ent-ferns' }, to: { type: 'page', entityId: 'ent-about' } },
      { kind: 'reference', from: { type: 'page', entityId: 'ent-contact' }, to: { type: 'page', entityId: 'ent-about' } },
      // Source-only includes: the targets are files, never pages.
      { kind: 'include', from: { type: 'page', entityId: 'ent-ferns' }, to: { type: 'source', sourcePath: 'content/includes/watering-note.md' } },
      { kind: 'include', from: { type: 'page', entityId: 'ent-about' }, to: { type: 'source', sourcePath: 'content/includes/nursery-address.md' } },
    ],
    problems: [
      {
        severity: 'warning',
        code: 'short-description',
        message: 'The description is shorter than 40 characters.',
        sourcePath: 'content/guides/ferns.md',
        line: 3,
        column: 1,
        origin: 'compiler',
      },
      {
        severity: 'info',
        code: null,
        message: "Tag 'shade' appears on a single page.",
        sourcePath: null,
        line: null,
        column: null,
        origin: 'compiler',
      },
    ],
  },

  readiness: {
    sourceRevision: REVISION,
    releaseId: RELEASE,
    items: [
      {
        // Configured but not generated.
        key: 'robots',
        label: 'robots.txt',
        category: 'discovery',
        configuration: 'configured',
        generated: null,
        deployment: null,
        observation: { status: 'not_checked' },
        action: { kind: 'run_check', label: 'Generate and check robots.txt', target: null },
      },
      {
        // Generated but not deployed.
        key: 'sitemap',
        label: 'XML sitemap',
        category: 'discovery',
        configuration: 'configured',
        generated: { sourceRevision: REVISION, evidenceId: EVIDENCE.sitemap },
        deployment: null,
        observation: { status: 'not_checked' },
        action: { kind: 'run_check', label: 'Validate the generated sitemap', target: null },
      },
      {
        // Passed evidence from an older release: visibly stale here.
        key: 'canonical',
        label: 'Canonical URLs',
        category: 'discovery',
        configuration: 'configured',
        generated: { sourceRevision: REVISION, evidenceId: EVIDENCE.canonicalGen },
        deployment: { releaseId: OLDER_RELEASE, evidenceId: EVIDENCE.canonicalDep },
        observation: {
          status: 'complete',
          verdict: 'passed',
          evidenceId: EVIDENCE.canonicalObs,
          method: 'compiler',
          observedAt: '2026-10-20T08:30:00Z',
          subject: { sourceRevision: null, releaseId: OLDER_RELEASE, url: null },
        },
        action: { kind: 'run_check', label: 'Re-check against the current release', target: null },
      },
      {
        // Current failure.
        key: 'social_preview',
        label: 'Social sharing preview',
        category: 'identity',
        configuration: 'configured',
        generated: { sourceRevision: REVISION, evidenceId: EVIDENCE.socialGen },
        deployment: { releaseId: RELEASE, evidenceId: EVIDENCE.socialDep },
        observation: {
          status: 'complete',
          verdict: 'failed',
          evidenceId: EVIDENCE.socialObs,
          method: 'live_http',
          observedAt: '2026-11-07T16:45:00Z',
          subject: {
            sourceRevision: null,
            releaseId: RELEASE,
            url: 'https://alder-ivy.example/guides/ferns',
          },
        },
        action: { kind: 'manual_setup', label: 'Add an explicit preview image to the fern guide', target: null },
      },
      {
        // Not applicable by owner decision.
        key: 'llms',
        label: 'llms.txt (proposal)',
        category: 'discovery',
        configuration: 'configured',
        generated: null,
        deployment: null,
        observation: {
          status: 'complete',
          verdict: 'not_applicable',
          evidenceId: EVIDENCE.llmsObs,
          method: 'human',
          observedAt: '2026-11-05T10:00:00Z',
          subject: { sourceRevision: REVISION, releaseId: null, url: null },
        },
        action: { kind: 'none', label: 'Recorded as not applicable', target: null },
      },
      {
        key: 'humans',
        label: 'humans.txt',
        category: 'identity',
        configuration: 'not_configured',
        generated: null,
        deployment: null,
        observation: { status: 'not_checked' },
        action: { kind: 'manual_setup', label: 'Describe the team in humans.txt', target: null },
      },
      {
        // Deployed but not checked.
        key: 'security_contact',
        label: 'Security contact',
        category: 'trust',
        configuration: 'configured',
        generated: { sourceRevision: REVISION, evidenceId: EVIDENCE.securityGen },
        deployment: { releaseId: RELEASE, evidenceId: EVIDENCE.securityDep },
        observation: { status: 'not_checked' },
        action: { kind: 'run_check', label: 'Verify /.well-known/security.txt', target: null },
      },
      {
        // Current pass tied to the displayed revision.
        key: 'about',
        label: 'About page',
        category: 'identity',
        configuration: 'configured',
        generated: null,
        deployment: { releaseId: RELEASE, evidenceId: EVIDENCE.aboutDep },
        observation: {
          status: 'complete',
          verdict: 'passed',
          evidenceId: EVIDENCE.aboutObs,
          method: 'compiler',
          observedAt: '2026-11-07T17:10:00Z',
          subject: { sourceRevision: REVISION, releaseId: null, url: null },
        },
        action: { kind: 'none', label: 'Up to date for this revision', target: null },
      },
      {
        key: 'contact',
        label: 'Contact page',
        category: 'identity',
        configuration: 'configured',
        generated: null,
        deployment: { releaseId: RELEASE, evidenceId: EVIDENCE.contactDep },
        observation: {
          status: 'complete',
          verdict: 'passed',
          evidenceId: EVIDENCE.contactObs,
          method: 'human',
          observedAt: '2026-11-06T09:30:00Z',
          subject: { sourceRevision: null, releaseId: RELEASE, url: null },
        },
        action: { kind: 'none', label: 'Up to date for this release', target: null },
      },
      {
        key: 'privacy',
        label: 'Privacy policy and consent',
        category: 'trust',
        configuration: 'not_configured',
        generated: null,
        deployment: null,
        observation: { status: 'not_checked' },
        action: { kind: 'open_page', label: 'Open the privacy page', target: 'ent-privacy' },
      },
      {
        key: 'google_search_console',
        label: 'Google Search Console',
        category: 'discovery',
        configuration: 'not_configured',
        generated: null,
        deployment: null,
        observation: { status: 'not_checked' },
        action: { kind: 'manual_setup', label: 'Verify site ownership in Search Console', target: null },
      },
      {
        key: 'bing_webmaster',
        label: 'Bing Webmaster Tools',
        category: 'discovery',
        configuration: 'not_configured',
        generated: null,
        deployment: null,
        observation: { status: 'not_checked' },
        action: { kind: 'manual_setup', label: 'Verify site ownership in Bing Webmaster Tools', target: null },
      },
      {
        // Observation error: the check itself failed.
        key: 'analytics',
        label: 'Analytics',
        category: 'measurement',
        configuration: 'configured',
        generated: null,
        deployment: null,
        observation: {
          status: 'error',
          code: 'provider_unreachable',
          message: 'The analytics provider could not be reached (simulated demo error).',
        },
        action: { kind: 'manual_setup', label: 'Check the provider connection', target: null },
      },
      {
        // Manual review still owed.
        key: 'image_alt',
        label: 'Image alt text',
        category: 'trust',
        configuration: 'configured',
        generated: null,
        deployment: null,
        observation: {
          status: 'complete',
          verdict: 'needs_review',
          evidenceId: EVIDENCE.altObs,
          method: 'human',
          observedAt: '2026-11-04T14:20:00Z',
          subject: { sourceRevision: REVISION, releaseId: null, url: null },
        },
        action: { kind: 'manual_setup', label: 'Review alt text on image-heavy pages', target: null },
      },
    ],
  },

  // Synthetic demo source. Shown raw by the UI; the application never
  // parses it. watering-note.md keeps CRLF endings on purpose so the
  // raw view can prove original line endings are preserved.
  sources: {
    'content/index.md': [
      '# Welcome',
      '',
      'Alder & Ivy Books is a small demonstration publication about field',
      'guides, plant care, and the nursery that produces them.',
      '',
      'Start with the [field guides](/guides) or read [about the nursery](/about).',
      '',
    ].join('\n'),
    'content/guides/index.md': [
      '# Field guides',
      '',
      'An index of the guides maintained by the nursery. Each guide is a',
      'satellite of this page in the publication structure.',
      '',
    ].join('\n'),
    'content/guides/ferns.md': [
      '# Ferns of the valley',
      '',
      'A walking guide to the ferns along the river path, with notes on',
      'identification and the care each species needs.',
      '',
      'Questions about the nursery? See the about page.',
      '',
    ].join('\n'),
    'content/plant-care/ferns.md': [
      '# Caring for ferns',
      '',
      'Draft care instructions. This page lives in the plant-care source',
      'folder even though its page parent is the fern guide.',
      '',
    ].join('\n'),
    'content/plant-care/ferns-seasons.md': [
      '# Seasonal fern care',
      '',
      'How fern care changes across the seasons, with a calendar the',
      'nursery follows for its own beds.',
      '',
    ].join('\n'),
    'content/guides/mosses.md': [
      '# Mosses of the shaded paths',
      '',
      'An archived guide kept for reference. It is no longer linked from',
      'the navigation.',
      '',
    ].join('\n'),
    'content/company/about.md': [
      '# About the nursery',
      '',
      'Alder & Ivy Books is run by two people, a small greenhouse, and an',
      'opinionated cat.',
      '',
      'INCLUDE: content/includes/nursery-address.md',
      '',
    ].join('\n'),
    'content/company/contact.md': [
      '# Contact',
      '',
      'Write to the nursery desk or visit during opening hours. See the',
      'about page for the postal address.',
      '',
    ].join('\n'),
    'content/legal/terms.md': [
      '# Terms of sale',
      '',
      'Plain-language terms for plant sales and workshop bookings.',
      '',
    ].join('\n'),
    'content/legal/privacy.md': [
      '# Privacy',
      '',
      'What the site collects, what it does not, and who to ask about it.',
      '',
    ].join('\n'),
    'content/includes/watering-note.md': [
      '> Watering note',
      '>',
      '> Ferns along the river path rarely need extra water. Check the',
      '> soil before carrying the can up the hill.',
      '',
    ].join('\r\n'),
    'content/includes/nursery-address.md': [
      '> Nursery address',
      '>',
      '> 7 Fernbrake Lane, opened Thursday to Sunday.',
      '',
    ].join('\n'),
  },
};
