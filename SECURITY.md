# Security posture

## Status: pre-release, local-only

Obsequious is a pre-release application. It has **no approved public
hosting, no authenticated editing workflow, and no supported production installation**. Do
not deploy it on a public host, tunnel it to the internet, or expose it
beyond your machine.

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

No dedicated security contact exists yet, and none is invented here. Contact
the repository owner through an existing private channel. GitHub private
vulnerability reporting has not been configured or verified; publishing source
does not enable it. Do not open public issues for security problems.

A security contact will be established before any public deployment is
approved — deployment itself remains gated behind the authentication and
release-safety milestones.
