# Decisions and planning evidence

## Recorded decisions

| Decision | Reason |
| --- | --- |
| Product name Obsequious, repository `obsequicms` | Names chosen by the owner. Tagline: "So you don't have to be." |
| Separate repository | The self-hosted CMS is a consumer of Boris, not a rewrite of Boris or its editor. |
| Self-hosted browser application | The owner selected this deployment shape over a local studio or hosted service. |
| One owner and one publication first | Supports the whole website workflow without initial tenancy or collaborative-editing complexity. |
| React 19 and Astryx | Uses the requested design system directly rather than wrapping it into the Svelte editor. |
| TypeScript server, Fastify, SQLite | One application language for the CMS, persistent local state, and a modest self-hosted deployment. Boris remains native and external. |
| Immutable source revisions and job workspaces | Prevents concurrent editing, preview, and publication from sharing writable compiler state. |
| Existing providers for analytics and webmaster data | The application owns the workflow, not a competing analytics or search service. |
| Demo first, real compiler proof before connected work | Allows useful bounded UI work while high-risk integration assumptions receive separate evidence. |
| Shell before parallel feature work | Fixes the client and route-loading interface before independent workers implement Structure and Readiness. |
| No all-purpose green score | Readiness reports applicable facts with scope and freshness instead of claiming complete website quality. |
| Shell layout: fixed side navigation (2026-11-08, P02) | Compared fixed side nav, compact icon rail, and top-only nav in a temporary demo route at 1280px and 390px. Eight persistent destinations need visible labels and grouping; Astryx guidance assigns 5+ destinations to SideNav and ≤5 to TopNav. Below the mobile breakpoint all three collapse to the same AppShell drawer, so the desktop evidence decides. Discarded layouts removed. |
| Real compiler gate as a separate root script (2026-11-08, P06) | `npm run test:boris` runs `vitest.boris.config.ts`, which includes only `apps/server/test/boris/compiler-gate.test.ts`; the standard `npm test` config excludes that file. Real compiler runs require `BORIS_BIN` and fail explicitly on a missing or digest-mismatched binary rather than skipping. Added `mjs`/`cjs` to the ESLint globals scope so the committed executable test stub lints as Node code. No Boris source, pins, or binary are committed. |
| Filesystem containment for job workspaces (2026-11-08, P06 follow-up R1) | Lexical path checks cannot stop destructive cleanup from following symlinked components out of a workspace. `resolveContainedPath()` verifies the workspace root is a real directory and `lstat`-walks every component below it (final one included), refusing symlinks; destructive helpers, cleanup, `hasFile`, and every artifact read go through it. Not-yet-existing output paths still prepare safely. Refusals leave links and targets untouched. |
| Full documentation-intelligence payload at the artifact boundary (2026-11-08, P06 follow-up R2) | The DI 0.2.0 parser now validates and returns the whole upstream schema body (summary, nodes, edges, source locations, pages, sources, findings, impact, diagnostics) instead of headers plus an invented `kind` field. Shape validation only — Boris stays authoritative for graph semantics. |
| Outcome/report matrix with `failureReport` (2026-11-08, P06 follow-up R3) | Per the upstream contract, content outcomes never read analysis reports (no `check`/`impact` report exists on content failure), so ordinary content failures are distinct from I/O failures and from missing artifacts after a successful run. IR and HTML operations parse the run's fresh failure report into a typed `failureReport` field — never as artifacts — and reject a report claiming `ok` on a content outcome. |
| Publication preparation docs (2026-11-08, P06 follow-up) | README separates the demo interface, the real compiler adapter, and the unimplemented connected backend; `docs/boris-binary.md` records acquisition and the Darwin-arm64 platform restriction without weakening the digest pin; `CONTRIBUTING.md` and `SECURITY.md` state packet rules and the pre-release posture with no invented security contact; CI documents that `test:boris` is intentionally not run there. License and repository visibility remain owner decisions. |
| Private source publication (2026-11-08, owner-authorized cleanup) | The owner selected `drawmeanelephant/obsequicms`, private visibility for a new repository, and normal publication of the verified implementation HEAD as remote `main` if the destination is empty. Local planning `main`, other branches, and other worktrees are preserved. This does not authorize deployment, package publication, or unrelated integrations. No license has been selected. |
| Public repository and PR/security safeguards (2026-11-08, owner-authorized follow-up) | Supersedes the private visibility decision above. The owner authorized public source and repository-level governance/security settings. Require PRs, up-to-date CI, resolved conversations, and no admin bypass; block force pushes and deletion of `main`; delete merged head branches. Preserve history through merge commits. With one maintainer, do not require an impossible self-approval. Enable private vulnerability reporting, secret scanning/push protection, Dependabot, CodeQL, dependency review, and least-privilege SHA-pinned Actions. No license, deployment, paid security product, or account-wide setting is selected. |

These decisions are defaults for the first implementation. A worker does not
silently replace them. A proposed change records its reason, affected callers,
and verification here for review.

## Open decisions

- The project license remains an owner decision. Public visibility is
  authorized above; GitHub private vulnerability reporting is enabled.
- Distribution of the approved compiler kit and a separately reviewed Linux
  provenance entry remain unresolved. P06 selected and verified the
  Darwin-arm64 binary recorded in [the acquisition guide](boris-binary.md).
- External analytics and search providers are selected before their integration
  packets, not by a prototype worker.
- The reviewed preview sandbox, authentication settings, and deployment packaging
  must be settled before remote access.
- Publishing only selected non-draft content needs a dependency-aware design.
  The initial public-release policy refuses draft-containing revisions.

## Planning evidence

Planning date: 2026-11-08.

The review used Boris contracts at
`c50d8622bd407bcb5f559a4d7ed5da440a2259ec`, editor API code and types, and the
Astryx documentation and `v0.7.11` core package manifest. This is source and
documentation evidence, not a compatibility certification.

The available local Node is `22.23.2`, not the planned Node 24 runtime.
The command named npm reports `99.0.0-npm-shim (bun 1.4.4)`, not real npm 11.
P00 must establish the selected toolchain without changing global tools.
No dependency installation or application build ran during planning.

The available local Boris build information reports version `boris/0.8.2` and
revision `1b0cb15d.dirty`. This is an environment mismatch, not an established
compiler defect. Current-version runtime behavior is unverified.

The plan keeps the full workflow scope while assigning only the initial,
bounded implementation packets. No child agents, remote accounts, provider
connections, or public deployments were created.
