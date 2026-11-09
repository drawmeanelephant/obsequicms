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

This repository has three layers with different maturity. Do not mistake one
for another.

**1. The demo interface — works today.**
An Astryx (React 19) application with a working Structure workspace (outline
and inventory views, search, filters, an inspector with dependency details)
and a Site Readiness workspace. Every screen renders explicitly labeled demo
data with a persistent "Demo data" label; a failed request never falls back
to sample data. Start it with `npm run dev:demo` (loopback only).

**2. The real compiler adapter — proven against a pinned Boris binary.**
`apps/server/src/boris/` implements the bounded process adapter (fixed argv
arrays, no shell, deadlines, separate output caps, termination escalation),
unique filesystem-contained job workspaces, producer artifact parsers (IR
`0.2.0`, `html-build-report-0.2.0`, `boris-documentation-intelligence` `0.2.0`),
and the six allowlisted compiler operations from
[the integration contract](docs/boris-integration.md). The explicit gate
(`npm run test:boris`) proves it against a digest-pinned `boris/0.9.0`
binary — real nested pages, real findings, real impact results, real content
failures with located diagnostics. This is a server library layer: it is
**not reachable over HTTP** and **not wired into the demo interface**.

**3. The connected backend — not implemented.**
There is no source store, no job runner, no sessions or authentication, no
application API beyond a loopback-only health endpoint, no publication, and
no analytics or provider connections. [The API contracts](docs/api.md) fix
the planned boundary; nothing serves it yet.

## Read the plan

- [Product scope](docs/product.md) defines the workflows and website housekeeping.
- [Architecture](docs/architecture.md) assigns ownership and records the stack.
- [Initial API contracts](docs/api.md) fixes the boundary for independent workers.
- [Boris integration](docs/boris-integration.md) records upstream constraints.
- [Roadmap](docs/roadmap.md) sequences milestones and their acceptance gates.
- [Work packets](docs/work-packets.md) contains copyable implementation briefs.
- [Decisions and evidence](docs/decisions.md) records defaults and unresolved work.
- [Agent rules](AGENTS.md) constrains implementation and handoffs.

## Requirements and setup (fresh clone)

- Node 24 — `.node-version` pins `24.22.2` for version managers; `engines`
  (enforced by `.npmrc`) requires Node `>=24 <25` and real npm `11`.
  Any Node 24 source works: a version manager, a system package, or the
  official installer. The repository does not depend on a machine-local
  toolchain.
- Dependency installation needs access to the npm registry. Browser tests also
  need Playwright's Chromium (`npx playwright install chromium`; on Linux,
  `npx playwright install --with-deps chromium` installs system dependencies).
  After setup, demo development needs no accounts, services, or environment
  files; all development listeners are loopback-only.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e   # builds the web app and tests it via loopback preview
npm run dev:demo   # labeled demo prototype on http://127.0.0.1:5173
npm run dev:server # loopback-only health endpoint on http://127.0.0.1:8787
```

## The real compiler gate

The adapter's real-compiler tests run separately from the standard suite and
require the pinned Boris binary:

```sh
BORIS_BIN=/absolute/path/to/pinned/boris npm run test:boris
```

A missing binary, or one whose SHA-256 does not match the committed
provenance record, **fails** this command — it is never silently skipped,
and no stub substitutes for a real run. Where the binary comes from, how its
digest is verified, and the current platform restriction are documented in
[docs/boris-binary.md](docs/boris-binary.md).

## Continuous integration

CI (`.github/workflows/ci.yml`) runs on Node `24.22.2`: install, lint,
typecheck, the standard unit/component suites, build, and the browser tests.
It does **not** run `npm run test:boris` — the pinned binary is a
machine-local artifact that is not published, so no real-compiler coverage
is claimed on CI. Running the gate remains a local step for anyone holding
the approved binary.

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) covers packet ownership, the checks each
change must pass, and the rules that keep demo data, failures, and real
compiler evidence honestly separated.

## Security posture

[SECURITY.md](SECURITY.md) records the current posture. In short: this is a
pre-release application with no approved public hosting, no authenticated
editing workflow, and loopback-only listeners; do not deploy it publicly.
No security contact is established yet.

## Repository status

The owner selected [drawmeanelephant/obsequicms](https://github.com/drawmeanelephant/obsequicms)
as the private source repository. Source publication is not deployment or
production readiness. No project license has been chosen, and this project is
not offered as open source. No application deployment is part of this work.
