# Contributing

Obsequious is a pre-release project developed in bounded, reviewed work
packets. Read [AGENTS.md](AGENTS.md) first — it defines the rules below in
full — plus [the product scope](docs/product.md),
[the architecture](docs/architecture.md), and
[the work packets](docs/work-packets.md).

## How work is organized

- Take **one packet** from [docs/work-packets.md](docs/work-packets.md) and
  work on an owned topic branch from a reviewed baseline. Own only the files
  your packet lists; report a missing dependency instead of improvising.
- Boris is an external compiler dependency, not a fork target. The admin
  interface uses published Astryx components. Do not introduce a second
  design system, a JavaScript Markdown pipeline, or a competing graph
  resolver.
- Do not create accounts, connect services, publish anything, or push unless
  the assignment explicitly authorizes it.

## Checks a change must pass

Open a topic-branch PR targeting `main`; direct pushes are blocked, including
for admins. CI must pass against the current base and conversations must be
resolved. Merge commits preserve the reviewed history; squash and rebase
merges are disabled. GitHub automatically deletes merged head branches.

The repository currently has one maintainer, so no independent approval is
required: an author cannot approve their own PR. Review your complete diff
before merging. Add an independent approval requirement when another
maintainer is appointed. Auto-merge is available, but no bot update is
automatically opted into it.

The six standard commands, with Node 24 and real npm 11:

```sh
npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e
```

Changes under `apps/server/src/boris/` (or its tests) additionally require
the real compiler gate:

```sh
BORIS_BIN=/absolute/path/to/pinned/boris npm run test:boris
```

See [docs/boris-binary.md](docs/boris-binary.md) for the approved binary and
the platform restriction. A missing or wrong binary fails the gate; it is
never skipped.

Actions are restricted to GitHub-owned actions pinned to full commit SHAs.
Keep workflow tokens read-only except for the explicit CodeQL security-report
upload permission. Do not run untrusted code with `pull_request_target`,
pass repository secrets to fork PRs, or weaken a required check to merge.
External-contributor fork workflows require maintainer approval.

Run the checks yourself and record exact commands and results in
`docs/work-reports/Pxx.md` for your packet. Do not report commands you did
not run, and do not weaken a check to make work pass.

## Honesty rules that are enforced in review

- Prototype data always carries a persistent "Demo data" label.
- A failed real request never falls back to sample data.
- An unavailable feature shows an explanation and no misleading success
  action.
- Generated, deployed, and live-verified are different facts; a missing,
  stale, or failed check is not a pass.
- Draft status is not access control
  ([why](docs/boris-integration.md#drafts-and-publication-safety)).
- Producer artifacts come from the pinned compiler; demo records are never
  dressed up as compiler captures.

Commits use the repository's existing Git identity. Never commit build
trees, caches, binaries, runtime data, or credentials — the tracked-file
audit in [the P06 follow-up report](docs/work-reports/P06-followup.md)
describes what belongs where. Security expectations live in
[SECURITY.md](SECURITY.md).
