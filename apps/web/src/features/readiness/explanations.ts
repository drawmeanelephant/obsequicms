import type { ReadinessKey } from '@obsequious/contracts';

/**
 * Per-key purpose and applicability copy. These explanations keep honest
 * boundaries: robots rules are not privacy, analytics is optional,
 * `llms.txt` is an unadopted proposal, and security contact files differ
 * from policy pages. No invented standards or checks exist here.
 */
export type KeyExplanation = {
  purpose: string;
  applicability: string;
};

export const KEY_EXPLANATIONS: Record<ReadinessKey, KeyExplanation> = {
  robots: {
    purpose:
      'robots.txt tells cooperating crawlers which paths they may request and where the sitemap lives.',
    applicability:
      'Robots rules are cooperation, not access control: they never keep anything private, and ignoring them carries no penalty beyond etiquette.',
  },
  sitemap: {
    purpose:
      'An XML sitemap lists the URLs eligible for discovery, in a form search engines can consume.',
    applicability:
      'Eligible URLs are not a promise of indexing; each engine decides what and when to crawl.',
  },
  canonical: {
    purpose:
      'Canonical declarations name the preferred address when the same content is reachable under several URLs.',
    applicability:
      'Canonical consistency prevents duplicate-content confusion; it does not merge reputations or fix broken links.',
  },
  social_preview: {
    purpose:
      'Open Graph and social card metadata give shared links a meaningful title, description, and explicit image.',
    applicability:
      'Each platform renders cards its own way; the only proof is a live check of a deployed release.',
  },
  llms: {
    purpose:
      'llms.txt is an emerging proposal for pointing AI crawlers at curated content.',
    applicability:
      'It has no adopted-standards status: no claim of crawler adoption or answer placement is possible today.',
  },
  humans: {
    purpose:
      'humans.txt credits the people and tools behind the site.',
    applicability:
      'It is purely informational and carries no standards status; omitting it says nothing about quality.',
  },
  security_contact: {
    purpose:
      '/.well-known/security.txt publishes a real reporting address for security researchers.',
    applicability:
      'The contact file is a different artifact from a human-readable security page, and publishing either is not a security guarantee.',
  },
  about: {
    purpose:
      'A useful About page grounds the site identity for visitors and for search engines.',
    applicability:
      'Identity details must come from the owner; the application never invents an organization.',
  },
  contact: {
    purpose:
      'A reachable contact path supports identity and trust signals.',
    applicability:
      'A contact page is not a monitored inbox by itself; the owner is responsible for answering it.',
  },
  privacy: {
    purpose:
      'The privacy policy describes what the real installation collects and who to ask about it.',
    applicability:
      'Consent configuration applies when measurement or consent-relevant features exist; analytics is optional and not a ranking requirement.',
  },
  google_search_console: {
    purpose:
      'Google Search Console provides ownership verification, sitemap submission, and Google-reported observations.',
    applicability:
      'Provider data reflects one engine; it says nothing about other crawlers or about rankings.',
  },
  bing_webmaster: {
    purpose:
      'Bing Webmaster Tools provides ownership verification, sitemap submission, and Bing-reported observations.',
    applicability:
      'Provider data reflects one engine; it says nothing about other crawlers or about rankings.',
  },
  analytics: {
    purpose:
      'Connects a measurement provider for traffic observations attributed to specific releases.',
    applicability:
      'Analytics is optional, requires explicit privacy and credential choices, and is not a ranking requirement.',
  },
  image_alt: {
    purpose:
      'Informative images need contextual alt text; decorative images need explicitly empty alt text.',
    applicability:
      'Automated checks cover a fraction of accessibility. Keyboard paths, forms, names, and headings still need manual review.',
  },
};
