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

These decisions are defaults for the first implementation. A worker does not
silently replace them. A proposed change records its reason, affected callers,
and verification here for review.

## Open decisions

- GitHub repository creation, visibility, and project license require the owner.
- The actual compiler release artifact and digest must be selected before P06.
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
