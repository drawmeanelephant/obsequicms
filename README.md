# Obsequious

So you don't have to be.

Obsequious is a planned self-hosted CMS for managing a whole website. Its
repository name is `obsequicms`. The admin interface uses Astryx. Boris owns
content validation, the publication graph, rendering, and its contracted outputs.

The product combines a substantial pages and structure workspace with writing,
media, website setup, search readiness, analytics, safe releases, and maintenance.
It keeps portable source files authoritative and keeps the published website
independent of the admin application's availability.

## Current state

This repository contains a planning baseline, not an application. It has no
package manifest, runnable server, connected accounts, or working CMS features.
No deployment or audit coverage is claimed.

The first deliverable is a working Astryx prototype with Structure and Site
Readiness workflows. The next milestone connects real source files and a pinned
Boris binary. Public deployment follows authentication and release-safety work.

## Read the plan

- [Product scope](docs/product.md) defines the workflows and website housekeeping.
- [Architecture](docs/architecture.md) assigns ownership and records the stack.
- [Initial API contracts](docs/api.md) fixes the boundary for independent workers.
- [Boris integration](docs/boris-integration.md) records upstream constraints.
- [Roadmap](docs/roadmap.md) sequences milestones and their acceptance gates.
- [Work packets](docs/work-packets.md) contains copyable implementation briefs.
- [Decisions and evidence](docs/decisions.md) records defaults and unresolved work.
- [Agent rules](AGENTS.md) constrains implementation and handoffs.

## Start the implementation

1. Give one worker [P00](docs/work-packets.md#p00-project-setup).
2. Give one worker [P01](docs/work-packets.md#p01-shared-contracts-and-demo-data).
3. Review and merge the contracts before other workers depend on them.
4. Complete P02 to establish the app shell and feature-loading interface.
5. Run P03 and P04 on separate branches. Their owned files do not overlap.
6. Use P05 to review the integrated prototype.
7. Resolve the compiler pin and start the real integration milestone.

The first wave needs no account credentials or public network listener. Do not
substitute demo data when a real API or compiler request fails.

## Development commands

P00 establishes `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`, and `npm run test:e2e`. These commands do not exist yet.
P00 also establishes `npm run dev:demo` as an explicitly labeled, loopback-only
prototype. Real compiler tests arrive with P06 as `npm run test:boris`.

## Repository status

The initial planning work is local. No GitHub repository, remote, or visibility
has been selected. The project license also remains unselected.
