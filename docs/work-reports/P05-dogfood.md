# P05: publication-owner dogfood review

Date: 2026-11-09. Tested commit: `665064d3207fb49f1485a3029e26676d17bd6a72`.
Local review branch: `p05-dogfood-review`.

This is the read-only review checkpoint before the separately authorized M1
implementation. Its findings describe the tested base checkout, not the later
connected implementation. Screenshot links refer to ignored local evidence,
not uploaded repository attachments.

## 1. Verdict: what an owner can genuinely do today

**This checkout supports an honest, usable read-only demonstration, not managing
a real publication.** An owner can search and filter synthetic pages, traverse
both parentage trees, inspect page metadata and immediate dependencies, read a
page's raw demo source, and distinguish readiness facts and evidence.

The interface repeatedly explains its limits. I did not encounter a crash,
silent fallback to plausible data, fabricated completed check, reversed
dependency label, or missing-evidence pass in the exercised flows. The six
standard checks pass. That does not establish a working compiler-connected
owner workflow.

The prioritized workflow remains incomplete:

> Find a problem → identify its page → reach its source location → inspect
> relationships and compiler-reported affected dependents.

Problems on a valid graph require knowing which page to inspect first.
Locations are passive text, includes cannot be opened as source, and there is
no impact view. Navigation also discards the current investigation. On small
screens, readiness selection updates a detail panel far below the visible list.

There is **no connected entry or application API beyond health** in this
checkout. `apps/web/src/main.tsx:16-25` explicitly constructs the demo client;
`apps/server/src/app.ts:8-18` registers only health. The real compiler adapter
is a separate library. Missing editing, preview, publication, authentication,
or provider connections are not newly discovered implementation bugs.

## 2. Tested environment and coverage

### Environment and safety

| Fact | Recorded value |
| --- | --- |
| Initial worktree | Clean `main`, tracking `origin/main`; no tracked or untracked user changes reported by Git |
| Runtime | `/usr/bin/node`, **v24.22.2**; real **npm 11.19.1**, `/usr/lib/node_modules/npm/bin/npm-cli.js`; no Bun shim |
| Host | Linux x86_64, kernel 6.1.189+ |
| Documented entry | `npm run dev:demo`, Vite, `http://127.0.0.1:5173/`; configured loopback host |
| Manual browser | Named, isolated `agent-browser` Chromium session; actual UA `HeadlessChrome/157.0.0.0` |
| Manual viewports | **1440×1000**, **390×844**, **768×1024** CSS pixels |
| Appearance | Light and system-dark appearance exercised; dark surfaces actually rendered |
| Automated browser checks | Playwright **1.65.0**, default Chromium; installed browser manifest names **158.0.8127.18** |
| Automated entry | Existing Playwright configuration builds the real web entry and serves loopback preview on `127.0.0.1:4173` |
| Data mode | **Demo throughout**. No owner content selected, copied, edited, or compiled |

This was not T3 Code; no shared T3 preview was used. Browser exploration
preceded reading component and test implementation. Product/architecture,
packets including P05/M1, API, integration, runtime configuration, and README
were read first.

The requested `docs/work-reports/P02-design-parity-review.md` **does not exist
at this checkout**. No old screenshots were used as evidence or treated as
current defects. All evidence below was captured in this session.

Artifacts are intentionally ignored under
`.cache/dogfood-2026-11-09/` (abbreviated **A** below). Links are local workspace
evidence, not remotely uploaded or committed artifacts. `A/journal.md` records
observations and rejected hypotheses.

The browser allowlist blocked a passive Google Fonts request for Figtree.
The recorded HAR contains 168 requests: 117 HTTP 200, 50 HTTP 304, one status-0
external font request, and **no `/api/` requests**. Manual screenshots can
therefore use a fallback font. This is a visual-environment caveat, not evidence
of an application network failure. Evidence: `A/demo-request-error.har`,
`A/browser-network.txt`, `A/browser-console.txt`, `A/browser-errors.txt`.
The captured browser runtime-error list is empty.

### Completed interface coverage

| Area | Actually exercised and observed |
| --- | --- |
| Pages and Structure | Both roots; full four-level Field guides → Ferns → Caring → Seasonal chain; parent/dependency selection; outline/inventory switching |
| Finding pages | Title `ferns`; source path `content/legal/`; combined `ferns` + Draft + plants returned only Caring for ferns; no-results recovery through Clear filters |
| Collapsed search | Collapsed Field guides, searched Seasonal; matching descendant and its ancestor path became visible |
| Page distinctions | Caring for ferns keeps `ent-fern-care`, `content/plant-care/ferns.md`, parent Ferns, and unknown public URL distinct; include endpoints do not become pages |
| Problems/source | Ferns warning, path/line/column, raw source and hash; attempted to continue to located source and include/impact inspection; gaps below |
| Source fidelity | Actual browser PRE text equals the original **186 UTF-8 bytes** of the LF fern demo source; PRE has no rendered Markdown child elements |
| Readiness | All 14 items; attention filter produces 11; configured-only robots, generated-only sitemap, deployed-unchecked security contact, stale canonical evidence, sharing failure, image-alt manual review, llms not-applicable, analytics check error |
| Missing/old evidence | Not checked stays distinct from passing; stale graph names both revisions and refuses mismatched source display; old readiness evidence names its old subject and a stale warning |
| Unavailable actions | Social-preview and canonical actions, including keyboard activation, explicitly say backend not connected, changed nothing, ran no check; no success implied |
| Destinations | Pages, Structure, Readiness, Editor, Media, Analytics, Publish, Settings; all five placeholders explain their unavailable scope; selected scenario survives navigation |
| History | Back, forward, and actual refresh of a deep workspace URL work at workspace/scenario level, but not selected-page/filter level |
| Keyboard, desktop | Skip link, radio view switch, search, combined status/tag filters, page selection, parent navigation, raw-source focus; readiness attention filter, item selection, action |
| Keyboard, 390px | Drawer opening, focus wrap, keyboard close and trigger-focus restoration; navigation to Readiness, attention filtering, canonical selection, reaching/activating its action |
| Responsive | Fresh phone and tablet layouts inspected; deepest tablet page selected; phone inventory horizontally scrolls its 960px table in a 358px region without widening the 390px body |
| Appearance/accessibility | Fresh light/dark captures; visible focus inspected; axe results below, not a complete accessibility certification |

All six named scenarios were opened through the actual application in **each
of Pages, Structure, and Readiness: 18 combinations**. Visible text is saved as
`A/{workspace}-{scenario}.txt`; Structure and Readiness also have corresponding
fresh PNGs. The existing suite additionally exercises the visible scenario
selector, rather than only direct URLs.

| Scenario | Pages / Structure | Readiness |
| --- | --- | --- |
| populated | Ten synthetic pages, relationships, page problems, raw source | Fourteen synthetic items and distinct evidence states |
| empty | Explicit valid/current graph with no pages | Fourteen unconfigured setup items, not a transport error |
| stale | Earlier graph named; source display withheld | Earlier generated/passing evidence explicitly stale |
| unavailable | No graph; process-origin demo problem | Explicit `no_graph` observation error plus unconfigured tasks |
| unsupported | Unsupported producer, not an empty valid site | Scenario supplies unconfigured readiness inventory; this is not proof of compiler support |
| request-error | Explicit load error; no tree/table or fallback | Explicit load error; no plausible readiness inventory |

Retrying request-error stays an error. These are **rejected demo-client
promises**, not failed HTTP requests. A real failed connected request and its
recovery remain untested because no connected transport exists.

### Limits and rejected hypotheses

- No real compiler run, connected disposable-project exercise, or live readiness
  verification was possible. No arbitrary Boris executable was run.
- CRLF source exists in a source-only include fixture, but that include cannot
  be opened through this interface. Its **browser** byte fidelity is untested.
- No screen-reader, physical touch device, Firefox, Safari, or real large
  publication was tested. Pointer interaction at 390px is viewport testing,
  not a physical-device certification.
- axe 4.12.1: mobile Structure **0 violations, 47 passes, 2 incomplete
  checks**; tablet Readiness **0 violations, 42 passes, 2 incomplete checks**.
  Incomplete ARIA/contrast checks are not passes. See `A/a11y-*.json`.
- A supposedly clipped phone drawer close button was an opening-animation
  frame. After animations settled, it was visible at x350–382 within 390px.
  **Rejected, not a finding.** Older exploratory drawer screenshots with a
  provisional `P05-002` filename are not evidence for the final P05-002 below.
- Default document scrolling does not move the application's nested main
  scroller. Reproduction used `scroll ... --selector "[role=main]"`.
- `A/keyboard-desktop.webm` exists, but its stop command reported no active
  recording; completeness is not claimed. Keyboard screenshots and observed
  focused-element results are the primary keyboard evidence.

## 3. Ranked findings

Three consequential owner-facing findings, all **Medium**: they obstruct
investigation without demonstrated data loss, exposure, or a crashed demo.
IDs follow discovery, not rank. None is called a regression or pre-existing
defect: no historical baseline comparison was performed.

### Rank 1 — P05-003: the problem-to-source investigation is not actionable

**Type:** read-only workflow gap, not a broken promised editor.
**Starting URL:** `http://127.0.0.1:5173/?workspace=structure&scenario=populated`.
**Viewport/prerequisites:** 1440×1000; loaded populated demo. Repeated from a
fresh route after the initial encounter.

1. Look for a publication-wide way to find problems on the current graph.
   None is offered; individual page selection is required.
2. Select **Ferns of the valley**. Read its `short-description` warning at
   `content/guides/ferns.md:3:1`.
3. Try to reach that line through the visible source interface. The location
   is plain text; the raw source has no line numbers, link, or highlighted line.
4. Inspect the outgoing `content/includes/watering-note.md` dependency.
   It is correctly labeled a source file, but offers no source-opening action.
5. Look for the affected-dependent/impact inspection. Only immediate
   incoming/outgoing lists are available.

**Expected owner outcome:** start with a problem, open its exact source
location, and inspect source dependencies and compiler-reported impact without
leaving this read-only investigation.

**Actual:** I can read a warning and manually read the selected page's source,
but cannot complete the located-source/include/impact part through the UI.
The warning is synthetic; this review does **not** establish that Boris emits
this particular diagnostic or that its demo location describes real content.

**Impact:** finding and understanding the cause requires external knowledge
and another tool. An owner cannot confidently trace a shared include or assess
affected dependents here. This blocks the assignment's main owner outcome,
not safe saving or publication, which remain outside scope.

**Evidence:** [inspector text](../../.cache/dogfood-2026-11-09/P05-003-source-inspector.txt),
[diagnostic and source screenshot](../../.cache/dogfood-2026-11-09/P05-003-diagnostic-source.png),
`A/browser-raw-source.json`, `A/source-fidelity.log`.

**Post-exploration diagnosis:** `PageInspector.tsx:29-54` renders the location
as text; `:90-99` makes source endpoints text, not destinations;
`SourcePreview.tsx:80-92` renders the unnumbered raw PRE.
`StructurePage.tsx:161-179` shows the global problems section only for
unavailable/unsupported graphs. Compiler impact exists in the adapter but is
not a UI/client operation. These are code-confirmed boundaries, not suspected
compiler defects.

### Rank 2 — P05-001: navigation discards the investigation context

**Type:** implemented navigation with an owner-workflow state-retention defect.
**Starting URL:** `http://127.0.0.1:5173/?workspace=structure&scenario=populated`.
**Viewport/prerequisites:** 1440×1000, populated demo. Reproduced more than
twice; also checked actual refresh.

1. Select **Ferns of the valley** and search **ferns**.
   [Before](../../.cache/dogfood-2026-11-09/P05-001-before.png).
2. Choose **Pages** in the sidebar.
   [After](../../.cache/dogfood-2026-11-09/P05-001-after.png).
3. Use browser **Back**.
   [Back result](../../.cache/dogfood-2026-11-09/P05-001-back.png).
4. Separately, select Ferns again and refresh the current deep workspace URL.

**Expected:** the same page and useful filters survive moving between two views
of its graph, returning through history, or refreshing an investigation.

**Actual:** Pages selects **Welcome**, clears the search, and loses the selected
problem page. Back returns to Structure but does not restore it. Refresh also
selects Welcome. In contrast, the in-workspace **Inventory** radio preserves
the selection. The URL only identifies workspace/scenario, not the page.

**Impact:** a normal navigation interruption breaks the problem trail.
Two apparent ways to reach inventory have different context behavior.

**Evidence:** linked before/after/history screenshots and
[reproduction video](../../.cache/dogfood-2026-11-09/P05-001-context.webm).

**Post-exploration diagnosis:** selection/filter/view are local state in
`StructurePage.tsx:93-116`; `App.tsx:59-61` keys the boundary by workspace,
remounting it; `useWorkspaceRoute.ts:18-23,43-49` retains workspace/scenario
only. Remounting is documented in the composition contract. This is an
owner-expectation defect, **not** a claim that the router violates that contract.

### Rank 3 — P05-002: phone readiness selection leaves its explanation remote

**Type:** unnecessarily difficult responsive layout and information hierarchy.
**Starting URL:** `http://127.0.0.1:5173/?workspace=readiness&scenario=populated`.
**Viewport/prerequisites:** 390×844, light appearance, All items, main scroller
at its initial position. Repeated from a fresh route.

1. Open Readiness. [Before](../../.cache/dogfood-2026-11-09/P05-002-detail-before.png).
2. Select **Canonical URLs**.
   [Selection result](../../.cache/dogfood-2026-11-09/P05-002-detail-selected.png).
3. Scroll the main content down 1440 CSS pixels.
   [Detail finally reached](../../.cache/dogfood-2026-11-09/P05-002-detail-reached.png).
4. Continue down to the next action.
   [Lower detail](../../.cache/dogfood-2026-11-09/P05-002-detail-action.png).

**Expected:** selecting an attention item makes its explanation easy to find,
with a clear path back to the list.

**Actual:** the row highlights, but no selected-detail text appears in the
viewport and no jump-to-detail control is offered. Immediately after selection,
the detail heading is at viewport y**2021.56** and Next action at y**3004.06**.
The visible main scroller is **683px** high. The whole inventory precedes detail.
Wrapped release/evidence UUIDs further separate the explanation from its action.

**Impact:** an owner sees a selection change without the reason or next step,
then must search far down the page. Comparing another item requires returning
to the list. This is a visual/operating cost, not missing evidence: keyboard
tabbing can reach the action and scroll it into view.

**Evidence:** linked step screenshots and
[reproduction video](../../.cache/dogfood-2026-11-09/P05-002-mobile-detail.webm).
`A/tablet-readiness.png` shows the same list-before-detail arrangement at tablet
width; the numeric measurements above apply only to the phone reproduction.

**Post-exploration diagnosis:** `ReadinessPage.tsx:159-227` places the whole list
before detail and selection only sets `selectedKey` (`:186`).
`index.css:128-134,286-305` uses a single column until the workspace is 56rem
wide. No selection-driven focus/scroll or detail jump is attached.

## 4. Workflow gaps by category

| Category | Current boundary |
| --- | --- |
| Implemented but broken for the owner expectation | **P05-001:** investigation restoration across implemented navigation/history/refresh. Workspace routing itself works; no data mutation or loss was observed |
| Misleading or unnecessarily difficult | **P05-002:** detail is remote from selection on phone/tablet. Readiness also exposes literal `needs_review`, `not_applicable`, `live_http`, and repeated UUIDs, increasing interpretation/reading effort. This is not evidence of wrong readiness facts or a failed contrast standard |
| Planned but not connected | Real project selection/snapshot/API/client; real diagnostics and check results; **P05-003** problem-first and source-line navigation; include-source and compiler-impact inspection; actual readiness execution/evidence |
| Intentionally out of this review's implementation scope | Saving/editing, restructuring, rich-text editing, preview transport, publishing/releases/rollback, authentication, media mutation, providers/crawlers. Their security gates must not be bypassed to improve the demo |

The persistent Demo data label and the unavailable-action explanation are
successful honesty affordances. Draft status is displayed as metadata, never
tested or represented as access control. No publish action was performed.

## 5. Boris parity gaps blocking owner outcomes

**No new missing upstream compiler capability or compiler regression was
proved.** The largest gaps are exposing capabilities Boris already has and
preserving their provenance in the application.

Historical evidence here is explicitly limited to the committed captures:
`apps/server/test/boris/fixtures/captured/capture-provenance.json` records
`boris/0.9.0`, source **c50d8622bd407bcb5f559a4d7ed5da440a2259ec**,
binary SHA-256 **9d2e3f0a07524ffe479287c8088796b4bb2de497838866734fefda21c6f34d8c**,
captured 2026-11-08. The approved build is **Darwin-arm64**. These are not
fresh runs on this Linux machine. The pinned source object was not present
in the separate local Boris checkout, and no fetch/build or substitute binary
was used.

| Owner outcome | Versioned evidence | Missing application parity |
| --- | --- | --- |
| Inspect a real publication graph | Captured frozen `graph.json`, IR **0.2.0**, has real IDs, titles, source paths, parents, tags, statuses, reference/include/parent edges | No connected entry, PageIndex mapping, isolated selected-project snapshot, or real source API: M1 remains unimplemented |
| Find real located problems | Captured `check.json`, `boris-documentation-intelligence` **0.2.0**, includes `unreferenced_page` at `index.md:1:1`; adapter `indexSource` separately exposes fresh `failureReport` on content outcomes | Demo warning is not a real run; current-graph problem discovery and located source navigation are absent. `ProblemSchema` has no remediation field, so forwarding remediation requested by M1 needs an agreed contract handoff |
| Understand affected dependents | Captured `impact.json`, same compiler/report version, for `guides/ferns` names **about, guides/ferns-care, index**; `artifacts.ts:677-692` preserves the full result | No impact client method/view. Immediate incoming edges are not a substitute for the compiler's transitive result; do not recompute it in JavaScript |
| Inspect included source | Captured graph includes page `guides/ferns` → source `includes/watering-note.md`; adapter keeps source endpoints distinct | UI can name the include but cannot open its raw bytes or inspect its dependents. Its CRLF demo source is consequently unreachable |
| Open projects using other producer formats | `artifacts.ts:120-122` accepts base IR **0.2.0** and explicitly rejects conditional **0.3.0/0.4.0** | Deliberate adapter coverage limit, not proof those Boris capabilities do not exist. Initial M1 must remain bounded and explicitly unsupported outside its accepted formats |
| Verify integration on this host | `docs/boris-binary.md` and committed provenance approve only the Darwin-arm64 digest | No approved runnable Linux kit; real compiler gate blocked. A separately reviewed platform pin is required, not an arbitrary local build or a relaxed digest check |

**Direction cross-check:** captured graph has child `guides/ferns-care` →
parent `guides/ferns`, reference `about` → `guides/ferns`, and page → source
include. The demo inspector's incoming/outgoing convention matches these
directions; `dependencies.ts:28-34` corroborates it. Demo IDs/edges and the
captured corpus are different datasets. This is not an end-to-end assertion
that captured compiler data reached the browser.

Routes, menu ordering, editing adapters, and publication safety must not be
inferred from this graph or invented to fill these gaps. They were not needed
to judge the read-only workflow.

## 6. The five changes I would prioritize

Recommendations only; none was implemented.

1. **Complete bounded read-only M1 before adding more demo surface.**
   Acceptance: one explicitly selected disposable project, server-owned
   snapshot, real-labeled revision and graph, exact contained source bytes,
   located content failures as unavailable, no demo fallback, unchanged live
   tree. Use an approved platform pin and real gate; otherwise stay blocked.
   No editing, preview, publication, or public listener is implied.
2. **Make problem → page → source line a complete read-only path (P05-003).**
   Acceptance: problems discoverable without guessing the page; selecting a
   located problem opens the matching revision/path/line/column with visible
   context and compiler explanation. Unknown locations remain unknown.
   Preserve exact source, including LF/CRLF; do not add a Markdown renderer.
   Forward remediation only through a reviewed contract.
3. **Expose include source and compiler-reported impact (P05-003).**
   Acceptance: a source-only include opens as a source file, never a page;
   affected endpoints come directly from the supported versioned compiler
   report and retain revision/provenance. A real known-impact test matches its
   expected affected set; unsupported/error/stale states remain explicit.
4. **Retain the investigation across both navigation paths (P05-001).**
   Acceptance: select Ferns, filter, toggle views, use sidebar Pages/Structure,
   visit Readiness, Back/Forward, and refresh; the relevant selected identity,
   filters, and view return consistently for the same source revision. Never
   recover identity by guessing from titles.
5. **Make selected detail local and simplify evidence reading (P05-002).**
   Acceptance: at 390px and tablet width, selecting an item exposes its detail
   or an explicit reachable detail action, with working keyboard focus and
   return-to-list context. Put reason/next action before repetitive provenance;
   keep full IDs/timestamps inspectable. Use owner-readable labels such as
   “Needs review” and “Live HTTP check,” preserving the original evidence.
   Stale evidence must still be unmistakably historical in light and dark.

## 7. Exact commands and results

Working directory: `/home/factory-user/repos/obsequicms`.
The commands below use the real npm CLI explicitly; nested npm scripts had
`/usr/bin` first on PATH. Logs are in **A**. No dependencies, assertions,
expectations, or application code were changed.

| Invocation, after `cd /home/factory-user/repos/obsequicms &&` | Result |
| --- | --- |
| `PATH=/usr/bin:$PATH /usr/bin/node /usr/lib/node_modules/npm/bin/npm-cli.js ci` | **0**, 487 packages installed; `A/npm-ci.log`. Fresh install preceded exploration |
| `PATH=/usr/bin:$PATH /usr/bin/node /usr/lib/node_modules/npm/bin/npm-cli.js run dev:demo` | Served documented loopback entry, `127.0.0.1:5173`; used for owner exploration |
| `PATH=/usr/bin:$PATH /usr/bin/node /usr/lib/node_modules/npm/bin/npm-cli.js run lint` | **0**; `A/lint.log` |
| `PATH=/usr/bin:$PATH /usr/bin/node /usr/lib/node_modules/npm/bin/npm-cli.js run typecheck` | **0**, all three workspaces; `A/typecheck.log` |
| `PATH=/usr/bin:$PATH /usr/bin/node /usr/lib/node_modules/npm/bin/npm-cli.js test` | **0**, **192/192 tests, 16 files**; `A/unit.log` |
| `PATH=/usr/bin:$PATH /usr/bin/node /usr/lib/node_modules/npm/bin/npm-cli.js run build` | **0**; `A/build.log` |
| `PATH=/usr/bin:$PATH /usr/bin/node /usr/lib/node_modules/npm/bin/npm-cli.js run test:e2e` | **0**, **45/45 browser tests**, 29.8s; `A/e2e.log` |
| `env -u BORIS_BIN PATH=/usr/bin:$PATH /usr/bin/node /usr/lib/node_modules/npm/bin/npm-cli.js run test:boris` | **1**, explicit `BORIS_BIN is not set` refusal; **14 skipped after failing suite setup**, not 14 passes; `A/boris-gate.log` |
| `/usr/bin/node --import tsx /home/factory-user/repos/obsequicms/.cache/dogfood-2026-11-09/verify-browser-source.mjs` | **0**, actual browser PRE equals 186 original UTF-8 fixture bytes; `A/source-fidelity.log` |

Validation warnings were retained: npm reports deprecated ESLint; Vitest emits
jsdom navigation and React `act` warnings; Vite reports dependency annotation
warnings and a >500kB minified chunk. These did not fail the commands and were
not turned into unmeasured performance findings.

Browser commands used the ignored wrapper `sh A/browser.sh`, which preserves
Factory's assigned session if present, otherwise derives a named worktree
session with prefix `p05-dogfood`. Initial navigation was:

```sh
sh /home/factory-user/repos/obsequicms/.cache/dogfood-2026-11-09/browser.sh --allowed-domains 127.0.0.1 open http://127.0.0.1:5173/
```

Scenario entries used the documented
`/?workspace=<pages|structure|readiness>&scenario=<named-scenario>` URLs,
followed by `wait --load networkidle`, real UI interactions, text capture, and
screenshots. Phone detail reproduction used:

```sh
sh /home/factory-user/repos/obsequicms/.cache/dogfood-2026-11-09/browser.sh set viewport 390 844
sh /home/factory-user/repos/obsequicms/.cache/dogfood-2026-11-09/browser.sh open "http://127.0.0.1:5173/?workspace=readiness&scenario=populated"
sh /home/factory-user/repos/obsequicms/.cache/dogfood-2026-11-09/browser.sh wait --load networkidle
sh /home/factory-user/repos/obsequicms/.cache/dogfood-2026-11-09/browser.sh find role button click --name "Canonical URLs Configured Generated Deployed: stale Observation: stale" --exact
sh /home/factory-user/repos/obsequicms/.cache/dogfood-2026-11-09/browser.sh scroll down 1440 --selector "[role=main]"
```

Fresh axe commands were `sh A/browser.sh a11y --json` in the documented mobile
Structure and tablet Readiness states. Their complete JSON outputs are
`A/a11y-mobile-structure.json` and `A/a11y-tablet-readiness.json`.

Screenshot preservation commands:

```sh
python3 /home/factory-user/repos/obsequicms/.cache/dogfood-2026-11-09/preserve-screenshots.py backup
python3 /home/factory-user/repos/obsequicms/.cache/dogfood-2026-11-09/preserve-screenshots.py restore
git -C /home/factory-user/repos/obsequicms diff --exit-code -- package.json package-lock.json apps packages docs/work-reports/screenshots
```

The helper backed up **four tracked originals**, retained generated test
screenshots under `A/e2e-generated-screenshots/`, restored all original bytes,
and verified SHA-256 equality. The final source/dependency/screenshot diff is
empty. Other fresh browser-test layout/theme images remain under ignored
`test-results/`. Passing `toBeVisible()` checks do not require a detail panel to
be in the current viewport, so the passing small-screen suite does not disprove
P05-002. Existing history tests check workspace routing, not P05-001's retained
investigation state.

**Only intended tracked change:** this report. No code fix, dependency change,
agent delegation, commit, push, publication, service connection, or GitHub issue
was performed.

Cleanup: the named review browser was closed. Stopping the npm parent left its
Vite child listening; the child was identified by the listening socket and
verified repository/Vite command line before termination. A final loopback
socket check confirmed port 5173 closed. No review server was left running.
