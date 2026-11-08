# Architecture

Status: chosen planning defaults. Security-sensitive implementations still need
the review gates in [the roadmap](roadmap.md).

## Application stack

The admin is a React 19 application built with Vite and TypeScript. It uses
Astryx core and the neutral theme at `0.7.11` as its starting point. It imports
prebuilt CSS, uses plain CSS for product-specific layout, and customizes tokens.
It does not need a StyleX source-build integration or Tailwind.

The server uses Node 24 LTS, TypeScript, Fastify 5, and Zod for external data
boundaries. Application records use SQLite through `better-sqlite3` and
versioned SQL migrations. A single server-owned worker runs durable jobs.
There is no Redis service or generic distributed queue in the initial design.

The project uses real npm 11 and npm workspaces with one lockfile. P00 pins
compatible dependency versions and exact tool versions. Unit and component
tests use Vitest and Testing Library. Browser tests use Playwright.

The planned layout has `apps/web`, `apps/server`, and `packages/contracts`.
The server adapter belongs under `apps/server/src/boris`. The initial scaffold
does not create unused packages or empty layers for hypothetical integrations.

## Ownership

| Data | Canonical owner |
| --- | --- |
| Document bytes and authored metadata | Source files in immutable source revisions |
| Grammar, resolved identities, parentage, dependencies, rendered markup | Boris and its versioned artifacts |
| Publication URL, target, theme, and supported metadata | Boris publication configuration and normalized plan |
| Owner, sessions, jobs, source-revision pointers, release records, observations | Application database |
| Additional readiness choices unsupported by Boris | Private `obsequious.json` source sidecar with a closed application schema |
| Visitor and search measurements | The connected provider, with attributed application observations |
| Actual live behavior | Dated HTTP, browser, or provider observations of a named release or URL |

The database does not own another copy of Markdown or a competing graph.
Cached compiler results retain their producing source revision and binary pin.
The sidecar never becomes extra Boris frontmatter or an arbitrary head-tag
escape hatch. Unsupported compiler output needs an explicit later decision.

## Source revisions

An installation stores private application data outside the repository and
outside all served roots. The planned layout is:

```text
data/
  app.sqlite
  sites/<site-id>/
    source/<source-revision>/       immutable portable source tree
    jobs/<job-id>/workspace/        isolated compiler workspace and reports
    releases/<release-id>/public/   immutable published artifact tree
```

Source revisions contain content, themes, selected static inputs, `boris.json`,
and the private application sidecar when present. Secrets are not source data.

A save checks the expected source revision and file hash. It writes a new
revision into an owned staging directory, then finalizes that directory before
updating the database pointer with compare-and-swap. An interrupted save cannot
make the pointer reference a partial revision. Orphaned staged revisions can be
removed only after proving they are application-owned and unreferenced.

Saving incomplete source is allowed. A failed compiler run keeps the last valid
graph available as explicitly stale data. Structured metadata edits and future
reparenting operations require a reviewed candidate patch and compiler
validation before application.

Identity within a revision is `(sourceRevision, entityId)`. A changed title is
not an identity mapping. Future rename plans record explicit old-to-new
identity and URL mappings rather than guessing from similar text.

## Jobs and releases

Each job records its kind, immutable source revision, idempotency key, state,
timestamps, compiler provenance, and results. States are `queued`, `running`,
`succeeded`, `failed`, `cancelled`, and `interrupted`.

Only the worker starts compiler processes. Jobs never share writable workspaces,
reports, or output roots. No database transaction remains open while a process
runs. On restart, unfinished running jobs become interrupted. Publication is
not silently retried after an unknown outcome.

Duplicate idempotency keys with identical request bodies return the original
operation. Reusing a key with different content returns a conflict.

A release binds a source revision, binary digest, build results, and output
inventory. Promotion changes a database pointer to an already finalized release.
Compiler per-file staging is not a whole-site publication transaction.
The application supplies the release boundary outside the compiler.

The public server reads only the active release's public tree. It never serves
source, application data, job workspaces, or arbitrary filesystem paths.
Live verification runs separately from local promotion. Its failure remains
visible even when a deployment operation succeeded.

## Security and deployment

Production is a self-hosted Linux installation behind a TLS reverse proxy.
The development target is macOS or Linux. P00's development listeners are
loopback-only. Container packaging follows the security and release gates.

- The first owner is established through a trusted local bootstrap operation,
  never an unauthenticated internet-facing setup form.
- Owner sessions use a maintained password-hashing approach, hashed session
  tokens, host-only secure HTTP-only cookies, expiration, and revocation.
  Mutations require origin checks and CSRF protection.
- Admin, preview, and public content use distinct configured origins. Preview
  transport requires authorization and a sandbox. Do not forward admin cookies
  or credentials to preview or content origins.
- Compiler execution uses an executable allowlist and argv arrays without a
  shell. The browser cannot choose an executable, working directory, or flags.
- Source and asset access reject traversal, symlinks, option injection, and
  paths outside the owned snapshot. Output is not a trusted path capability.
- Child processes have time and output limits. Termination and restart tests
  must prove that no orphan compiler survives.
- Later crawlers recheck DNS, destination addresses, and every redirect at
  connection time. They reject private networks and metadata endpoints. The
  hardcoded compiler-preview connection is not a general crawler exception.
- Provider secrets stay server-side. Backups exclude keys unless an explicit
  secure key-backup procedure includes them. Restore is tested before release.

Authentication, sandbox settings, secret custody, public serving, and crawler
egress policy are review requirements, not tasks to improvise in a UI packet.

## Preview and authoring

The first editor preserves raw source and obtains HTML from Boris. It does not
render an alternative Markdown preview. Rich-text editing follows tests that
prove lossless treatment of supported syntax, including includes and components.

Initial previews inspect built immutable artifacts through an isolated content
origin. Continuous preview, when implemented, uses managed
`boris watch --serve` and its machine events. It does not introduce another
Markdown renderer or a competing file-watch compiler.

The existing `boris-editor` host remains loopback-only and is not exposed as
the self-hosted application's backend.
