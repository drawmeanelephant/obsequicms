# Implementation roadmap

Status: M0's demo prototype and the P06 compiler-adapter proof are implemented
and reviewed; see [the work reports](work-reports/). Connected M1 work and the
later milestones remain planned. This is not a production-readiness claim.

## M0: useful prototype

Complete P00, P01, and P02 in sequence. Then run P03 and P04 on separate
branches. P05 integrates and reviews their results. This milestone is suitable
for bounded lower-cost model work, with contract review before parallel work.

The result is an Astryx application with a substantial Structure workspace,
a page inspector, a Readiness workspace, and honest unsupported states for
other areas. A persistent label identifies sample data.

Acceptance requires keyboard operation, small-screen layout, usable empty and
error states, stale compiler data, and generated-but-unverified readiness data.
No user account, production listener, remote connection, or real save is implied.

## M1: real private editing and preview

P06 first proves the compiler adapter against a pinned binary. Higher-reasoning
work then implements the private source store, compare-and-swap saves,
SQLite migrations, durable jobs, and the real HTTP client.

Acceptance starts from a small actual Boris source tree. An owner can inspect
its pages, edit and save source, see compiler diagnostics, and preview the
compiler's HTML. Restart preserves saved source and job history. A conflicting
save does not overwrite newer source. Failure preserves explicitly stale
last-good results rather than fabricating a successful current graph.

This milestone remains private to a trusted development environment until the
authentication and content-origin gate is complete.

## M2: first self-hosted release

Implement owner bootstrap and sessions, CSRF and origin checks, isolated preview
delivery, immutable releases, promotion, rollback, and backup restoration.
Review these pieces together before allowing remote access.

The release accepts one owner, one publication, Markdown source, a supported
single-target profile, and supported static assets. Draft-containing revisions
are refused for public release. The UI explains that limitation before the
owner attempts publication.

Acceptance publishes a real release through the application's public entry
point, observes its HTTP behavior, survives an interrupted build, retains the
prior live release on failure, performs rollback, and restores from a backup.
Source, credentials, draft content, and workspaces are inaccessible publicly.

## M3: website housekeeping and live checks

Implement configuration and generation for the applicable readiness inventory.
Reuse Boris head metadata, sitemap, and static support within their actual
execution limits. Add a reviewed server-side crawler for the configured site,
then scheduled checks with historical evidence.

Acceptance distinguishes configuration, local generation, deployment, and live
verification. It catches a broken live URL and verifies its repair. DNS changes,
redirects to private addresses, timeouts, oversized responses, and missing
credentials do not produce successful checks.

## M4: connected services and deeper authoring

Add provider-backed analytics, search webmaster integrations, explicit external
actions, media transformations, and source-preserving structured edits.
Choose one analytics provider and one search-service connection first.
Do not build a competing analytics or search-indexing engine.

Safe reparenting follows the candidate-patch and impact review flow. Rich-text
editing follows syntax-preservation evidence. Publishing non-draft subsets
follows a separate dependency and disclosure review.

## Review gates

| Gate | Required evidence |
| --- | --- |
| Contracts | Real producer shapes distinguished from demo records, invalid states rejected, no invented compiler semantics |
| Compiler | Pinned provenance, successful and failed real runs, fresh reports, unsupported versions, bounded processes and shutdown |
| Source | Stale writes, concurrent operations, interruption between filesystem and database updates, byte preservation |
| Internet access | Authentication, CSRF, content-origin isolation, path containment, secrets, draft disclosure tests |
| Release | Interruption, repeat requests, last-good preservation, live verification, rollback, tested restoration |
| Crawler and providers | Restricted egress, redirect and DNS checks, scoped credentials, explicit permission for external writes |

Gates are implementation and review tasks, not checkboxes that prototype work
can mark complete. New packet briefs for M1 and later follow P06 findings.
