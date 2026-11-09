# P06 publication follow-up: cleanup and local verification

Date: 2026-11-08. Owner-authorized source publication to
`drawmeanelephant/obsequicms`, private if newly created. No delegation.
Deployment, package publication, and unrelated integrations are not authorized.

## Selected implementation and preserved work

Inspected status, branches, worktrees, recent history, remotes, filesystem
ownership, and the existing Git identity before editing.

- Completed baseline: `m0-second-pass` at
  `e84de37bd0745f5e98ad7a0f145fba3e81cb3bc2`.
- Cleanup worktree: `t3/cleanup-and-publish-to-github`, starting at that same
  commit, not the planning baseline on local `main`.
- Local `main` stays at `5e7bee31d244646d4ca00ad32a1afe0f59f01149`.
  `m0-prototype` stays at `e4560ba06d5b43d8639185d3caefa9c9cb680005`;
  `m0-second-pass` and its checkout are untouched.
- The parent checkout's pre-existing untracked `t3-1233d65b/` entry is the
  active worktree, not disposable output. It is preserved.
- There were no existing remotes or uncommitted files in the cleanup worktree.
  The existing author/committer identity is used unchanged.

## Hardening evidence

No production code or tests needed correction. The complete
`apps/web` and `packages/contracts` trees are unchanged since the reviewed
P05 corrective commit `7c82f3e`.

- **Containment:** all 17 workspace tests and 14 operation tests pass.
  Test-owned external sentinel files survive refused cleanup through
  symlinked parents, final components, and deeper output components.
  Cleanup removes internal links without following them; operation reads
  refuse a link planted by the producer after report preparation.
- **Actual analysis:** the real gate retains the `unreferenced_page` finding
  for `index`, its source location, and impact endpoints
  `about`, `guides/ferns-care`, and `index`. It also preserves a genuinely
  empty impact array and corpus-level findings.
- **Content failures:** invalid parentage remains a content outcome through
  index, preview, validation, check, and impact. Fresh failure diagnostics
  remain located; graph-dependent analysis does not attempt a missing-report
  read. Repair succeeds without stale reuse. Missing reports after successful
  runs remain typed artifact failures.
- **Output delivery:** the controlled executable completes stream writes
  before normal exit. The full suite exercises exact 1 MiB stdout and stderr
  delivery, both 64 KiB overrun paths, and the unchanged default 16 MiB cap.
  Five fresh full-suite processes passed, not just an isolated process test.
- **UI regressions:** retained assertions exercise announcement timing,
  collapsed-tree search and repeated filtering, native modified navigation,
  keyboard activation, history navigation, and evidence-backed readiness
  opt-outs. The real demo entry also passes at desktop and 390 CSS pixels.

## Publication audit

Audited all 12 baseline commits and 200 unique reachable file blobs, plus
commit messages and historical paths. A local audit script enumerated Git
objects, scanned credentials/private-key/token/credential-URL patterns and
high-entropy quoted strings, inventoried binary and oversized blobs, and
checked dependency origins and runtime/cache paths. Manual inspection covered
fixtures, provenance, configuration, documentation, and all six historical
PNG payloads. No suspected secret, private source content, accidental binary,
runtime data, or cache was found. This is a bounded audit, not a security
certification.

The only binary payloads are four synthetic-demo review screenshots, with two
earlier versions in history. None is regenerated in the publishable worktree.
Every non-workspace dependency resolves from `registry.npmjs.org`; no
machine-local dependency path is present. P00 retains a dated local toolchain
path as historical evidence, not a setup dependency. Captured compiler reports
retain their original temporary paths with provenance. No history is rewritten.

## Changed files

- `README.md`: private target selection, accurate setup/network/browser
  prerequisites, no deployment or production-readiness claim, license undecided.
- `SECURITY.md`: no assumed GitHub vulnerability-reporting setup and no
  invented security contact.
- `docs/boris-binary.md`: upstream `--out` takes a directory, worktree paths
  are corrected, extraction uses a fresh directory, and exact-kit availability
  and rebuild limitations are explicit. Verified the procedure against
  `scripts/agent-pack.sh` at the pinned upstream revision, without changing
  that repository or the compiler pin.
- `docs/decisions.md`: records the owner's publication authorization and
  removes resolved repository/binary selection from open decisions.
- `docs/roadmap.md`: distinguishes completed demo/adapter evidence from
  planned connected work.
- `docs/work-reports/P06-publication.md`: this evidence report.

## Exact local verification

Toolchain: Node `v24.22.2`, real npm `11.19.1`. Commands used
`PATH=/Users/tbuddy/dev/obsequicms/.tooling/node/bin:$PATH`; no global settings
changed. Compiler:
`/tmp/obsequicms-boris-kit/boris-agent-kit/bin/boris`, SHA-256
`9d2e3f0a07524ffe479287c8088796b4bb2de497838866734fefda21c6f34d8c`.

The staged documentation candidate tree
`1c0854081af421573203632ff23550e56ac7eacc` was exported with `git archive`
to `/tmp/obsequicms-publication.TVUDlj/clean`. Before installation it had no
`.git`, `node_modules`, `.tooling`, or `.cache`. External prerequisites were
the selected toolchain, the approved compiler, and installed Playwright
Chromium. No project state was copied from ignored directories.
Logs are in `/tmp/obsequicms-publication.TVUDlj/logs`.

| Command in the clean export | Observed result |
| --- | --- |
| `npm ci` | Exit 0, 506 packages installed |
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0, all three workspaces |
| `npm test` | Exit 0, 192/192 in 16 files, five consecutive fresh processes |
| `npm run build` | Exit 0, server and web |
| `CI=1 npm run test:e2e` | Exit 0, 28/28; fresh loopback preview, no server reuse |
| `BORIS_BIN=/tmp/obsequicms-boris-kit/boris-agent-kit/bin/boris npm run test:boris` | Exit 0, 14/14, digest enforced |
| `env -u BORIS_BIN npm run test:boris` | Expected exit 1, explicit unset-variable error |
| `BORIS_BIN=/tmp/obsequicms-publication.TVUDlj/does-not-exist npm run test:boris` | Expected exit 1, explicit nonexistent-path error |
| `BORIS_BIN=/Users/tbuddy/dev/boris/zig-out/bin/boris npm run test:boris` | Expected exit 1, incompatible real binary rejected by digest |
| `git diff --cached --check` | Exit 0 |

Negative gates fail their suite setup; Vitest lists their unexecuted cases
as skipped, but the command fails. They are not compiler acceptance passes.
Positive gates skip no tests. No caps, deadlines, assertions, or test selection
were relaxed. Build outputs, reports, and screenshot generation stay in the
temporary export, outside both worktrees.

Existing non-fatal warnings remain: ESLint deprecation, Rollup dependency
annotations and large chunks, jsdom document navigation, React test `act`
warnings, and conflicting terminal color settings. No dependency upgrade or
warning suppression was attempted.

## Remote boundary and next packet

Before the first remote write, authenticated GitHub login matched the requested
owner `drawmeanelephant`; reading the exact destination returned HTTP 404.
This report records pre-publication local evidence, not a successful push or
remote CI result. The committed HEAD must pass a final clean-export run before
creation/push; the publication handoff records the resulting remote SHA and CI.
CI runs standard gates only, not the machine-local real-compiler gate.

Remaining owner decisions: project license, a private security-reporting
channel, distribution of the approved compiler kit, and Linux compiler
provenance. The current real-compiler proof is Darwin-arm64 only.

Next implementation packet: **M1: connect one real project, read-only** in
[the work packets](../work-packets.md#m1-connect-one-real-project-read-only).
The connected backend, authentication, editing, publication, deployment, and
provider integrations are still unimplemented.
