# P06 follow-up: validated security updates and merge gates

Date: 2026-11-08. The owner authorized merging the repository setup and
dependency-fix PRs, without bypassing protection.

## Completed setup evidence

[PR 4](https://github.com/drawmeanelephant/obsequicms/pull/4) merged as
`7c58999f019b08dde77e64290df810d5f0e2437e` after CI, dependency review,
both CodeQL analyses, and the CodeQL results check passed. Actual analyses
were uploaded for JavaScript/TypeScript and Actions, not inferred from YAML.

`main` now requires all five observed checks, bound to their actual apps:
`verify`, `dependency-review`, `Analyze (javascript-typescript)`, and
`Analyze (actions)` from GitHub Actions (15368), plus `CodeQL` from GitHub
code scanning (57789). The base must be current; admins cannot bypass.
PRs and resolved conversations are required. Force pushes and deletion of
`main` remain blocked; merged heads auto-delete.

After a real `main` scan established both categories, an active repository
ruleset, **CodeQL security gate** (26821884), was added for `refs/heads/main`,
with no bypass actors. It requires CodeQL reports and blocks high-or-higher
security findings and error-level findings. The solo-maintainer policy still
does not require impossible self-approval.

## Dependency PR scope and corrections

[PR 1](https://github.com/drawmeanelephant/obsequicms/pull/1) and
[PR 3](https://github.com/drawmeanelephant/obsequicms/pull/3) initially contain
byte-identical `package.json` and `package-lock.json` blobs:
`67db5f50fe0e6201599c540ed2f5b261640832b9` and
`6cde7581c5f1c50116d429a34d4cc6db55097b6c`. Both select Vitest `5.1.0`,
removing tinypool and updating mocker. One validated update covers both;
the duplicate need not introduce another dependency change.

PR 1 was updated with `main` through GitHub's normal branch-update operation,
producing `a53580c064efd99105fc29254c9614dc1efb0d1b`, without force or rebase.

Initial clean validation reproduced a real failure: web typechecking could
not resolve `node:fs`, `node:path`, `node:crypto`, or `process`. Its config
includes Node-based tests/e2e files, but relied on Node types supplied
transitively by the old Vitest declarations. `apps/web/tsconfig.json` now
lists the existing `node` type dependency explicitly. No typecheck is skipped
or weakened.

CodeQL also reported `js/file-system-race` in the compiler gate's test-only
`hashTree`: `statSync(path)` followed by `readFileSync(path)`. The helper
now opens the entry first, uses `fstatSync(fd)`, reads from that same
descriptor, and closes it in `finally`. The finding is not suppressed or
dismissed; a new remote analysis must verify the result.

Other changes: README/SECURITY describe the actual required security gates;
the decision log records the authorized tooling update; this report captures
the evidence. No application runtime, compiler source, digest pin, fixture,
source mutation, publication path, license, or deployment changes.

## Exact local checks

Clean exports:
`/tmp/obsequicms-security.LA9cAu/dependencies` (initial failure) and
`/tmp/obsequicms-security.LA9cAu/dependencies-fixed` (corrected candidate).
Node `24.22.2`, real npm `11.19.1`, approved Darwin-arm64 compiler. Generated
screenshots and build/test outputs stayed outside the publishable worktree.
Corrected logs: `/tmp/obsequicms-security.LA9cAu/fixed-logs`.

| Command | Corrected candidate result |
| --- | --- |
| `npm ci` | Exit 0, 488 packages |
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0, all workspaces |
| `npm test` | Exit 0, 192/192 in 16 files, three fresh full-suite processes |
| `npm run build` | Exit 0 |
| `CI=1 npm run test:e2e` | Exit 0, 28/28 |
| `BORIS_BIN=/tmp/obsequicms-boris-kit/boris-agent-kit/bin/boris npm run test:boris` | Exit 0, 14/14 |
| `env -u BORIS_BIN npm run test:boris` | Expected exit 1, explicit unset-binary failure |
| `BORIS_BIN=/Users/tbuddy/dev/boris/zig-out/bin/boris npm run test:boris` | Expected exit 1, incompatible binary digest rejected |
| `npm audit --json` | Exit 1: zero high/critical, seven moderate package entries from one minimatch advisory chain |

The audit is **not** a pass. Advisory `GHSA-g3hv-75wg-m249` remains in
minimatch through TypeScript-ESLint. npm proposes downgrading unrelated tooling;
that was not applied to manufacture a clean audit. The remaining moderate
advisory needs a separate compatible upstream fix/review. The vulnerable
tinypool/mocker paths are removed by the validated update.

Existing deprecation, build-size/annotation, jsdom navigation, and React `act`
warnings remain visible. No limits, assertions, or test selection were relaxed.
Remote acceptance and final alert counts are reported in the PR/handoff after
the committed head is scanned and merged normally.
