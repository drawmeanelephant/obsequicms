# Security posture

## Status: pre-release, local-only

Obsequious is a pre-release application. It has **no approved public
hosting, no authenticated editing workflow, and no supported production
installation**. Do not deploy it on a public host, tunnel it to the internet,
or expose it beyond your machine. Public source availability does not change
these runtime restrictions.

Concretely, today:

- All development listeners (`dev:demo` on 5173, `dev:server` on 8787) bind
  to loopback only, by design, and the port is the only configurable part.
- The server exposes a loopback health endpoint. There are no sessions, no
  accounts, and no application API yet; the compiler adapter is a library
  layer that HTTP handlers cannot reach.
- Compiler execution is a fixed-argv allowlist run inside
  filesystem-contained job workspaces. There is no path from browser input
  to an executable, a working directory, or a flag.
- Source-file access, editing, publication, crawlers, and provider
  integrations are **not implemented**. Their designs require the review
  gates in [the architecture](docs/architecture.md#security-and-deployment)
  and [the roadmap](docs/roadmap.md) — a successful prototype does not waive
  them.

## Environment files

`.env.example` is a template; the development server reads `PORT` only.
Never commit real values. There are no provider secrets in this repository
because no provider is connected.

## Reporting a problem

Use [GitHub's private vulnerability reporting](https://github.com/drawmeanelephant/obsequicms/security/advisories/new).
It is enabled for this repository. Do not open public issues or PRs containing
vulnerability details, credentials, or private source content. If that route
is unavailable, contact the owner through an existing private channel.

Include the affected commit, reproduction steps, impact, and a minimal
sanitized example. No dedicated email address, response-time guarantee,
bounty, or production-support commitment is established.

## Repository safeguards

- Secret scanning and push protection are enabled. They do not detect every
  secret; never commit credentials. If one leaks, revoke it before discussing
  history remediation with the owner. Do not rewrite history unilaterally.
- Dependabot alerts and security updates are enabled. Weekly npm and GitHub
  Actions update PRs remain subject to the same merge gates as other PRs.
- CodeQL scans JavaScript/TypeScript and workflows. Dependency review checks
  PR dependency changes for high or critical known vulnerabilities.
- Actions use full commit pins and read-only default tokens. Only GitHub-owned
  actions are allowed; CodeQL's analysis job alone requests security-report
  upload permission. Fork workflows from external contributors need approval.
- `main` requires PRs, current CI, and resolved conversations, even for admins.
  Force pushes and branch deletion are blocked.

These controls are not a guarantee of security or a substitute for the
authentication, source, process, and release review gates. No license has
been chosen. Deployment remains outside this repository-setup work.
