# Product scope

Status: planning baseline, 2026-11-08. Nothing in this document is a claim that
the application exists.

Obsequious helps one owner run one self-hosted publication through a browser.
The owner can manage source, arrange pages, prepare the site for visitors and
discovery, publish it, measure it, and repair problems without assembling
unrelated administration tools.

## Ten complete workflows

| Workflow | User outcome |
| --- | --- |
| Start or migrate | Create a publication or review imported source, assets, old URLs, and required redirects. Importers remain separate tools. |
| Organize | Inspect and arrange pages, hierarchy, navigation, dependencies, and URLs without confusing them. |
| Write and revise | Edit source, recover work, inspect revisions, resolve conflicts, and preview compiler output. |
| Manage media | Upload assets, provide captions and contextual alt text, prepare image variants, and inspect usage before removal. |
| Design | Choose supported themes and layouts, inspect small screens, and check accessibility and performance. |
| Prepare for discovery | Configure metadata, sharing, indexing, feeds, sitemaps, and applicable website conventions. |
| Publish | Build a fixed source revision, inspect the release, promote it, check the live site, and roll back. |
| Measure | Connect an analytics provider and search webmaster tools with explicit privacy and credential choices. |
| Maintain | Schedule live checks, investigate failures, and keep evidence tied to the release that was checked. |
| Improve and recover | Prioritize content work, verify repairs, manage credentials, back up the installation, and test restoration. |

The shared interaction is finding a problem, seeing the affected pages, editing
the cause, previewing the result, publishing, and checking the live repair.

## Pages and structure

Structure is a flagship workspace with three views of the same compiler data.
The outline shows parentage. The inventory supports search, filters, and
eventual bulk actions. The relationship inspector explains incoming references,
includes, direct parentage, and compiler-reported impact.

Each page connects its source location, compiler identity, source revision,
metadata, problems, preview, published location when known, and release history.
Traffic and search observations attach through explicit URL and release records.

Source folders, entity identity, parentage, menu placement, and public URLs are
distinct. Reparenting does not imply renaming a file or changing a route.
Manual menu ordering and arbitrary route overrides are not assumed compiler
capabilities. Unsupported changes need a reviewed implementation decision.

The intended restructuring flow previews the source patch, affected dependents,
and any URL changes before applying it. It includes a keyboard operation, not
only drag and drop. The first prototype is read-only and says so.

## Website readiness inventory

Readiness selects applicable tasks. It does not install every possible file or
turn a checklist into a universal quality score.

| Area | Planned coverage |
| --- | --- |
| Crawl and indexing | `robots.txt`, page indexing directives, canonical consistency, and robots versus noindex conflicts. Robots rules are not access control. |
| Sitemaps and feeds | Valid XML sitemaps, eligible URLs, feed links, and submission guidance. |
| Search services | Google Search Console and Bing Webmaster Tools ownership setup, property selection, sitemap submission, and supported IndexNow use. |
| Metadata and sharing | Titles, descriptions, Open Graph, social cards, explicit images, and favicons. |
| Structured data | Only schemas supported by the actual content. No invented organizations, ratings, reviews, or guarantees of rich results. |
| AI discovery | Optional `llms.txt`, labeled as an emerging proposal. No claim of crawler adoption or answer placement. |
| Human identity | Optional `humans.txt`, useful About and Contact pages, author or organization details supplied by the owner. |
| Security contact | `/.well-known/security.txt`, a real reporting address, and an optional human-readable security page. These are different artifacts. |
| Privacy and measurement | Optional analytics, applicable consent configuration, and policy pages that describe the real installation. Analytics is not a ranking requirement. |
| Accessibility | Contextual alt text, empty alt text for decorative images, keyboard paths, forms, names, headings, and manual review. |
| Conditional conventions | Multilingual signals for multilingual sites, `ads.txt` for applicable advertising, and a web app manifest only for a corresponding app experience. |
| Delivery | HTTP status codes, redirects, TLS, caching, compression, missing assets, and headers appropriate to the deployed site. |

`cyborgs.txt` and `mutants.txt` have no invented standards status. An owner can
add custom static files without earning a fabricated readiness pass.

## Evidence in the interface

Configuration, generated artifacts, deployment, and verification appear
separately. Each observation names its method, source revision or release,
timestamp, scope, and result. The application marks old evidence stale.

Source and build checks do not certify the live server. A successful HTTP
request does not establish search indexing. Automated accessibility checks do
not establish complete accessibility. No score guarantees rankings.

## First release boundary

The first production release serves one owner and one publication. It includes
safe source editing, read-only structural inspection, compiler preview, a
bounded readiness setup, and local immutable releases with rollback.
Readiness starts with explicit configuration and local evidence, then gains
live checks and external service connections.

The full workflow catalog remains the product scope. Initial sequencing does
not remove media, analytics, page restructuring, or maintenance from that scope.
Multiple owners, live co-editing, multisite tenancy, arbitrary block builders,
a plugin marketplace, and an in-house analytics engine are outside this release.
