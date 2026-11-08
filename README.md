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

M0 prototype: an Astryx (React 19) application with a working Structure
workspace and Site Readiness workspace over explicitly labeled demo data,
plus an application-server scaffold with a loopback health endpoint. No
account, real source store, compiler connection, public deployment, or
audit coverage exists. Every screen labels its data as demo data.

The next milestone connects real source files and a pinned Boris binary
(P06). Public deployment follows authentication and release-safety work.

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

M0 (P00–P05) is implemented on the `m0-prototype` branch; see
[the work reports](docs/work-reports). P06 — the real compiler adapter
proof against a pinned binary — is the next packet.

The first wave needs no account credentials or public network listener. Do not
substitute demo data when a real API or compiler request fails.

## Development commands

Requirements: Node 24 and real npm 11 (`.node-version` pins `24.22.2`;
`engines` enforces the range). The repository keeps a pinned local
toolchain in the git-ignored `.tooling/node/` directory on the machine
where it was set up; a fresh clone can supply Node 24 any way it prefers.

```sh
# with a Node 24 / npm 11 toolchain first on PATH
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e   # builds the web app and tests it via loopback preview
npm run dev:demo   # labeled demo prototype on http://127.0.0.1:5173
npm run dev:server # loopback-only health endpoint on http://127.0.0.1:8787
```

The real compiler gate runs separately and requires a pinned Boris binary:

```sh
BORIS_BIN=/absolute/path/to/pinned/boris npm run test:boris
```

A missing or incompatible binary fails the gate instead of skipping it.
See [the P06 provenance record](apps/server/test/boris/provenance/boris-0.9.0.json)
for the recorded compiler build and
[the P06 report](docs/work-reports/P06.md) for the real-versus-stub evidence
separation.

## Repository status

The initial planning work is local. No GitHub repository, remote, or visibility
has been selected. The project license also remains unselected.
