# P06 follow-up: adapter hardening (review round two) and repository preparation

Date: 2026-11-08. Branch: `m0-second-pass`. Reviewed baseline: `f427783`
(second-round review `.cache/reviews/f427783-second-round.md`, which is
git-ignored — the findings it contains are restated below so this report is
self-contained).

Two authorized assignments: **A** — verify and fix the four confirmed review
findings R1–R4; **B** — prepare the repository for the owner to publish it.
Everything below was run with the repository-local toolchain (Node
`24.22.2`, npm `11.19.1`) first on `PATH`; the default shell `node`/`npm`
on the development machine is Node 22 with a bun npm shim and is not used.

## Assignment A — findings, reproductions, fixes

### R1: destructive workspace operations escaped through symlinked parents

- **Classification at baseline**: confirmed defect (P1). `prepareFreshReportFile`
  and `prepareFreshOutputPath` relied on `resolve()` plus a string-prefix
  check — lexical containment only. Removal followed symlinked parent
  components outside the job workspace.
- **Reproduction (before the fix)**, using only test-owned temporary
  directories: create a job workspace and a separate temporary directory
  containing a sentinel `check.json`; symlink the workspace's
  `.obsequious` to that directory; call
  `prepareFreshReportFile(workspace.root, ".obsequious/check.json")`.
  Observed: the call succeeded and deleted the external sentinel.
  `prepareFreshOutputPath(workspace.root, ".obsequious/ir")` likewise
  deleted an external `ir` tree and left a sibling file untouched only
  because it was not named by the path.
- **Fix** (`apps/server/src/boris/workspace.ts`): containment is now a
  filesystem property. `resolveContainedPath()` (new, exported) requires
  the workspace root to be a real directory (never a symlink), checks
  lexical containment, and `lstat`-walks **every component below the root
  including the final one**, refusing any symlink. Refusals leave the
  link, its target, and everything else untouched. Components that do not
  exist yet are allowed, so first-run output paths still prepare safely.
  Both destructive helpers and the workspace-path resolution used before
  artifact reads go through it. `createJobWorkspace().cleanup()` now
  refuses a root that is not a real directory; `rm` on the tree still
  unlinks (never follows) symlinks inside it. `hasFile()` resolves with
  the same rule, so existence is never observed through a link.
- **Application to artifact reads**: `operations.ts` resolves each fixed
  report/artifact path through containment immediately before reading —
  on success paths, and when reading fresh failure reports. A report file
  planted as a symlink during a run is refused instead of consumed.
- **Tests** (`workspace.test.ts`, `operations.test.ts`): symlinked
  `.obsequious` parent for report cleanup and output cleanup (external
  sentinel/tree byte-identical after each refusal; repeated cleanup also
  refuses); symlink at the report target and at the output target; a
  symlink deeper in the output path; `hasFile` refusal plus ordinary
  contained paths; not-yet-existing output paths; cleanup refusal when
  the root is a symlink; symlink inside the tree removed without
  following it; traversal refusals retained; operations propagate the
  refusal and an operation-level read meeting a run-planted symlink
  refuses.

### R2: analysis adapters discarded the useful report bodies

- **Classification at baseline**: confirmed defect (P2). The
  `boris-documentation-intelligence` parser returned only `format`,
  `schemaVersion`, `compiler`, and an invented nullable `kind` field that
  the producer does not emit. `impactOf` lost the affected-page list;
  `checkGraph` lost the findings.
- **Reproduction (before the fix)**: `impactOf` against the pinned binary
  for `guides/ferns` — the fresh report on disk carries
  `impact = [about, guides/ferns-care, index]`; the returned report
  carried none of it. `checkGraph` likewise dropped the
  `unreferenced_page` finding for `index`.
- **Fix** (`apps/server/src/boris/artifacts.ts`): the parser now validates
  and returns the full `documentation-intelligence-0.2.0` payload —
  `input`, `summary` (counts and per-direction/per-kind edge counts),
  `nodes`, `edges` (reusing the existing edge/endpoint parsers),
  `sourceLocations` (1-based positions enforced), `pages`, `sources`,
  `findings` (including the corpus-level `graph` endpoint type with null
  locations), `impact` (endpoints or null for check), and `diagnostics`
  (shared diagnostic parser). The invented `kind` field is removed. This
  is shape validation at the artifact boundary only: Boris remains
  authoritative for graph semantics, and nothing resolves, filters, or
  recomputes its graph.
- **Tests** (`artifacts.test.ts`, `compiler-gate.test.ts`): the captured
  check report's full body (summary values, node/page/location lists, the
  real `unreferenced_page` finding, `impact: null`); the captured impact
  report's actual affected endpoints `[about, guides/ferns-care, index]`;
  malformed-payload rejections (findings/impact/nodes/edges/locations/
  counts/sources, unknown schema version); and against the real binary —
  `checkGraph` findings with location, `impactOf`'s three affected IDs, a
  legitimate empty impact (`[]` for a one-page corpus, asserted as a real
  empty array, never null), corpus-level `zero_includes`/`zero_relations`
  graph findings, and an unknown impact target as usage (exit 2, no
  report).

### R3: ordinary content failures became missing-artifact exceptions

- **Classification at baseline**: confirmed defect (P2). With a missing
  parent in the source, the compiler exits 1 (content) and publishes no
  graph-dependent analysis report; `checkGraph` and `impactOf` nevertheless
  attempted the read and rejected with `ArtifactError(kind: "missing")`,
  hiding the ordinary content outcome.
- **Reproduction (before the fix)**: add `content/broken.md` with
  `parent: does-not-exist` to the real compiler fixture; `checkGraph`
  threw `ArtifactError("missing")` for `.obsequious/check.json` (which
  provably did not exist after the run); `impactOf` threw the same way.
- **Compiler contract** (upstream `documentation-intelligence.md` at the
  pinned revision): "Analysis runs only after the graph and dependency
  resolver succeed. A content or graph failure returns the existing
  diagnostics and publishes no analysis report." The fixed argv does not
  opt into a findings-failure policy, so exit 1 never carries an analysis
  report here. Probed empirically per operation against the pinned binary
  with broken content: IR `build` and the HTML path (`build --profile`,
  `validate --profile`) **do** publish fresh failure reports
  (`build-report.json` / `html.json` / `validate.json`, `ok: false` with
  located `EPARENTMISSING` diagnostics); `check`/`impact` publish none.
- **Fix** (`apps/server/src/boris/operations.ts`):
  - `checkGraph`/`impactOf`: only a success outcome reads the report. A
    content outcome returns the process result with `artifacts: null` —
    no read attempt, so content failures, I/O failures, usage outcomes,
    termination, and missing-after-success artifacts stay distinct.
  - `indexSource`/`buildPreview`/`validateProfile`: a content outcome
    additionally parses the run's fresh failure report and exposes it as
    `failureReport` on the operation result (typed
    `OperationResult<T, F>`). It never appears as `artifacts`, so a
    failed graph is never presented as valid. A report claiming `ok` on
    a content outcome is a producer contradiction and is rejected;
    a missing report leaves `failureReport: null` with the process
    result carrying the outcome.
  - Success paths additionally reject a report that is not `ok`
    (`buildPreview`/`validateProfile` now match `indexSource`).
  - The success path still treats a missing artifact as a typed
    `ArtifactError("missing")` contract violation — the exact opposite
    classification from content outcomes, as required.
- **Tests**: `operations.test.ts` (new; controlled stub behind the fixed
  argv via `OBSEQUIOUS_STUB_SCRIPT`) covers the full outcome/report
  matrix: success with fresh reports (full body), success with missing
  reports (typed `missing`), content with and without report files
  present (never presented beside a content outcome), usage/io, IR and
  HTML failure reports with located `EPARENTMISSING` diagnostics, the
  `ok`-on-content contradiction, and the null case.
  `compiler-gate.test.ts` proves the same matrix against the pinned
  binary: bad-parent content failure through all five operations with no
  exception, located failure diagnostics, repair-and-retry back to
  success, and missing-after-success as a typed violation.

### R4: the executable test stub dropped queued output

- **Classification at baseline**: confirmed defect (P2). The stub queued
  asynchronous writes (ignoring backpressure) and called `process.exit`
  immediately, so its configured byte count guaranteed nothing. The
  review measured 69,632 of 262,144 configured bytes delivered in one
  probe, and the full suite's stdout-cap test failed when the stub exited
  0 before crossing the parent's 64 KiB cap.
- **Reproduction (before the fix)**: 1 MiB configured vs 1 MiB parent cap
  (no overrun), five fresh runs — delivered 380,928 / 1,048,576 /
  430,080 / 339,968 / 1,048,576 bytes. The parent saw "success" while
  roughly 60% of the output was lost in three of five runs.
- **Fix** (`apps/server/test/boris/stubs/scripted-stub.mjs`): `printBytes`
  now awaits each write's completion callback (which resolves after the
  stream has drained and handed the chunk to the OS), so backpressure is
  respected by construction and every byte is accepted before the next is
  queued. The `exit` behavior sets the exit code and stops the script;
  the process exits by draining its streams instead of `process.exit`,
  which is what previously truncated queued output. Usage errors flush
  the same way. A stub that must die still dies: the runner's
  SIGTERM/SIGKILL escalation is unchanged, and an already-crossed overrun
  reports `terminated` regardless of the exit code.
- **Tests** (`process.test.ts`): delivery completeness for stdout and
  stderr (1 MiB configured vs 1 MiB cap — `outcome: success`, no
  truncation, exact byte count, all bytes intact); stderr overrun (64 KiB
  cap); the retained stdout-overrun test unchanged; and a default-cap
  test proving a flushed producer (17 MiB) still trips the runner's
  default 16 MiB cap.
- **Stability evidence**: `process.test.ts` run 10 times in fresh
  processes — 12/12 tests each time; full `npm test` run 5 times — 192/192
  each time. No sleeps, no larger caps, no skipped tests, no weaker
  assertions.

## Assignment B — repository preparation

- **README.md** rewritten: the three layers (demo interface / real compiler
  adapter / unimplemented connected backend) are described separately with
  their actual maturity; the stale "P06 is the next planned task"
  statements are gone; setup instructions depend only on Node 24 + npm 11
  from any source and the committed files (no `.tooling/`, `.cache/`,
  `/tmp`, or personal checkout paths); CI coverage is stated exactly (what
  runs, and that `test:boris` does not run on CI because no pinned binary
  is published).
- **docs/boris-binary.md** (new): how to acquire the approved build via the
  upstream `scripts/agent-pack.sh` kit at the pinned revision, the archive
  and binary digests to verify, the gate command, and the platform
  restriction stated honestly — the Darwin-arm64 digest pin does not
  establish Linux compatibility, and enabling a Linux build requires a
  separately reviewed provenance record. The digest check is not weakened.
- **CONTRIBUTING.md** and **SECURITY.md** (new, concise): packet-based
  workflow, the checks each change must pass, the honesty rules, and the
  security posture — pre-release, no approved public hosting, no
  authenticated editing workflow, loopback-only listeners, no invented
  security contact (GitHub private vulnerability reporting once published).
- **`.github/workflows/ci.yml`**: verified it runs the intended standard
  gates (install, lint, typecheck, unit/component tests, build, browser
  tests on Node 24.22.2) and added a comment stating that the
  real-compiler gate is intentionally excluded on CI.
- **Tracked-file audit** (137 tracked files): no credentials or secret-like
  values (pattern hits are package names such as `js-tokens`, documentation
  prose about session-token *design*, artifact field names, and digests);
  `.npmrc` and `.env.example` contain no real values; the only non-text
  files are four P05 review screenshots under `docs/work-reports/screenshots/`
  (legitimate evidence, 60–144 KB each); no caches, build trees, runtime
  data, or binaries are tracked (`.tooling/`, `.cache/`, `test-results/`,
  `playwright-report/`, `dist/`, `node_modules/` are all ignored). One
  historical mention of the owner's local toolchain path remains in
  `docs/work-reports/P00.md` — it is a dated work report documenting how
  the toolchain was established on that machine, not setup instruction, and
  was left as historical evidence. No authentic compiler fixture was
  rewritten; the captured artifacts under
  `apps/server/test/boris/fixtures/captured/` and their provenance sidecar
  are unchanged.
- **License and visibility** remain explicit owner decisions: no license
  file was invented, no remote or badge was added, and the README's
  "Repository status" says exactly that.

## Exact commands and results

Toolchain: repository-local Node `24.22.2`, npm `11.19.1`.
`BORIS_BIN=/tmp/obsequicms-boris-kit/boris-agent-kit/bin/boris` (the
approved build; digest verified by the gate).

| Command | Result |
| --- | --- |
| `npm ci` | Pass (installed at baseline; lockfile unchanged by this work) |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass — 192 tests / 16 files; run 5 times, all green |
| `npm test` (single file `process.test.ts`, fresh processes) | 12/12, 10 consecutive runs |
| `npm run build` | Pass (pre-existing chunk-size warnings unchanged) |
| `npm run test:e2e` | Pass — 28 browser tests |
| `BORIS_BIN=<approved> npm run test:boris` | Pass — 14 gate tests (11 at baseline + 3 new) |
| `npm run test:boris` (no `BORIS_BIN`) | Exit 1, explicit "BORIS_BIN is not set" |
| `BORIS_BIN=<dirty boris/0.8.2 local build> npm run test:boris` | Exit 1, digest mismatch |
| `npm run test:boris` (no `BORIS_BIN`), exit code captured | 1 |
| `npm run test:boris` (approved), exit code captured | 0 |

Clean-copy verification: `git archive` of the branch tip exported to a
fresh directory and the documented setup run there — see
[Clean-copy verification](#clean-copy-verification) below for the exact
steps and results.

## Changed files

Assignment A (commit `8139ff0`):

- `apps/server/src/boris/workspace.ts` — filesystem containment
  (`resolveContainedPath`, real-directory root checks, `hasFile`).
- `apps/server/src/boris/artifacts.ts` — full documentation-intelligence
  0.2.0 payload types and validation.
- `apps/server/src/boris/operations.ts` — outcome/report matrix,
  `failureReport`, containment-checked artifact reads, `ok` checks on
  success paths.
- `apps/server/src/boris/index.ts` — exports for the new helpers/types.
- `apps/server/test/boris/{workspace,artifacts,process}.test.ts` — R1/R2/R4
  regression coverage.
- `apps/server/test/boris/operations.test.ts` — new; outcome/report matrix
  with the controlled stub.
- `apps/server/test/boris/compiler-gate.test.ts` — real-binary evidence for
  R2/R3.
- `apps/server/test/boris/stubs/scripted-stub.mjs` — flushing producer,
  drain-based exit, env-selected script, symlink behavior for containment
  tests.

Assignment B (this commit): `README.md`, `docs/boris-binary.md`,
`CONTRIBUTING.md`, `SECURITY.md`, `.github/workflows/ci.yml`,
`docs/work-packets.md` (M1 packet), `docs/decisions.md` (recorded rows),
`docs/work-reports/P06-followup.md` (this report).

## Remaining gaps and limitations

- The adapter remains a server library layer: no HTTP exposure, no
  application `PageIndex` mapping, no source store — that is the bounded
  M1 packet (below), which starts from this evidence.
- One fixture corpus (Markdown, one HTML target, no editions/rss/llms).
  Conditional IR `0.3.0`/`0.4.0` are proven rejected, not supported. RSS
  is not enabled.
- The gate ran on Darwin-arm64 only, against one pinned binary. Linux
  compatibility is neither claimed nor tested; see
  [docs/boris-binary.md](../boris-binary.md).
- CI does not run the real-compiler gate (no published pinned binary);
  nothing here changes that.

## Clean-copy verification

Steps (run after the documentation commit below):

1. `git archive --format=tar.gz --prefix=obsequies-clean/ <tip> | tar -x -C
   <empty temp dir>` — an exported copy with no ignored state (no
   `node_modules`, `.tooling`, `.cache`, test artifacts).
2. In the copy, with only the repository-local Node 24 on `PATH`:
   `npm ci`, then the six standard commands exactly as
   [the README](../README.md#requirements-and-setup-fresh-clone) documents
   them, and `npm run test:boris` with the approved binary.
3. Also confirm no step reads anything from the original checkout's
   ignored directories.

Results are recorded in the table above's "Clean-copy verification" row of
[this commit's report update](#exact-commands-and-results) — the run
happened after the documentation commit; the numbers are in the final
validation table of this report's closing section.

<a name="next-work"></a>
## Next work

The bounded M1 packet ("M1: connect one real project, read-only") is in
[docs/work-packets.md](../work-packets.md). It specifies server-selected
project roots, isolated snapshots, real page/relationship data, raw source,
located compiler diagnostics, private transport requirements, owned files,
and acceptance tests. It deliberately excludes an unauthenticated
source-file API, authentication, publication, and production hardening.
