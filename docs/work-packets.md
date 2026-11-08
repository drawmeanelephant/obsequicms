# Implementation work packets

These are implementation briefs, not completed work. Assign one packet per
worker. No model or agent has been launched by creating this document.

## Common assignment

Copy this paragraph, then the selected packet, into an implementation task:

> Work in the `obsequicms` repository. Read `AGENTS.md`, the packet's linked
> specifications, and the existing implementation before editing. Implement
> only the assigned packet. Preserve another worker's files. Use published
> Astryx APIs rather than guessing components or props. Do not change the
> stack, add features outside scope, change Boris, connect accounts, publish,
> or push. If a prerequisite or contract is missing, report the blocker.
> Run the packet's checks and write `docs/work-reports/Pxx.md` with exact
> commands, results, changed files, observable evidence, and unresolved gaps.
> A demo must be labeled. A stub or empty test is not acceptance evidence.

## Dependency and ownership rules

The sequence is P00, P01, then P02. Review and merge P01 before shell work.
P03 and P04 depend on P02 but not on one another. P05 follows both.
P06 depends on P01 and a valid compiler pin, and can proceed independently of
the UI work when assigned to a capable implementer.

Only P00 initially edits the root lockfile and tool configuration. Later
dependency changes need one named owner. Parallel workers write separate
reports rather than editing this plan or a shared progress file.

Work on separate branches from the same reviewed baseline. Do not share a
writable checkout for concurrent implementation.

## P00: project setup

Suitability: lower-cost model. No compiler, authentication, or database logic.

Read [the architecture](architecture.md#application-stack).
Create the npm workspace and runnable development and test commands.

Owned files are root package and tool configuration, the initial lockfile,
`.node-version`, `.env.example`, CI configuration, and minimal package
manifests and entry points under `apps/web`, `apps/server`, and
`packages/contracts`. Create stable placeholder exports for
`features/structure/StructurePage.tsx` and
`features/readiness/ReadinessPage.tsx`. P01 adds their `ObsequiousClient`
prop types. Structure also accepts the optional `initialView` specified in
[the prototype composition contract](api.md#prototype-composition).
Do not invent the client contract early.

Use Node 24 and real npm 11. Pin the exact tool versions and compatible
dependencies. Astryx core and neutral theme start at `0.7.11`, with their
published peer dependencies. Do not run a command through a Bun npm shim and
report it as npm validation. Do not install packages globally.

Establish `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`,
`npm run build`, `npm run test:e2e`, and `npm run dev:demo`.
Configure co-located browser tests as the prototype composition contract defines.
The server has only a loopback health endpoint in this packet. It does not
pretend to implement sessions or the application API.

Acceptance:

- A clean install with the pinned tools passes the six non-development commands.
- The browser shows Obsequious and an explicit prototype label.
- An actual Fastify health test checks its status and body.
- A browser test loads the application and finds its heading by accessible name.
- No test uses an empty assertion, unconditional success, or a pass-with-no-tests
  flag. CI runs the same commands.
- Source and build outputs are ignored. No Boris binary or credentials are
  committed. The two feature placeholders say that they are not connected.

## P01: shared contracts and demo data

Suitability: bounded model work, followed by contract review.

Depends on P00. Read [the API specification](api.md) and
[the integration constraints](boris-integration.md).

Own `packages/contracts/**`, the placeholder prop annotations created by P00,
and `apps/web/src/demo/**`. Do not change server behavior or product styling.

Implement Zod schemas, inferred TypeScript types, typed API errors, and
`ObsequiousClient`. These are application view records, not raw Boris producer
parsers. P06 owns producer adapters. Do not fabricate compiler artifacts or label
demo records as compiler captures. The initial demo client implements the read
methods `getSite`, `getPages`, `getReadiness`, and `getSource`. It rejects
`saveSource`, `startJob`, and `getJob` with a typed unsupported error.
Export `createDemoClient(scenario)` for P02's demo entry.

Provide deterministic named scenarios: `populated`, `empty`, `stale`,
`unavailable`, `unsupported`, and `request-error`. The populated data includes
two root pages, a chain at least three levels deep, source folder placement
that differs from parentage, tags, all authored status values, and a source-only
include dependency. Keep published URLs unknown unless the fixture explicitly
describes a simulated release.

Readiness examples include configured-but-not-generated,
generated-but-not-deployed, deployed-but-not-checked, passed evidence for an older
release, a current failure, a manual-review item, and a not-applicable item.
Every record is synthetic and the client mode is `demo`.

Acceptance:

- Schema tests reject malformed discriminators, invalid status combinations,
  unknown request fields, and a passed observation without evidence.
- Current graph data requires matching source and graph revisions.
- All demo scenarios satisfy the application contracts.
- No network request, file mutation, compiler execution, or fabricated real
  verification occurs.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.

## P02: Astryx application shell

Suitability: lower-cost model with UI competence.

Depends on P01. Read [the product scope](product.md) and the Astryx docs matching
the installed release. Own `apps/web/src/shell/**`, `apps/web/src/App.tsx`,
the demo entry's composition, the top-level route wiring, and shell tests.
Do not edit feature folders, contracts, demo scenario records, or root dependencies.

Build persistent navigation for Pages, Structure, Editor, Media, Readiness,
Analytics, Publish, and Settings. Pages and Structure initially lead to the
Structure feature in inventory and outline modes. Readiness mounts its feature.
Other destinations explain that they are not connected.
Implement the injected client and query-parameter interface in
[the composition contract](api.md#prototype-composition). P03 and P04 depend on
this working shell, not on speculative imports between concurrent branches.

Use Astryx layout, navigation, forms, dialogs, and tokens where applicable.
Do not assume particular component names before consulting the installed docs.
Use a restrained product theme. Do not rebrand every workspace.

Compare three shell arrangements in one temporary demo route before choosing:
fixed side navigation, compact side navigation, and top navigation. They use
the same data and feature slots. Record the choice and remove discarded layouts.
This is a local prototype task, not a request to publish screenshots.

Acceptance:

- Feature selection works with a keyboard and has a visible focus state.
- The current section and persistent "Demo data" label are accessible by name.
- At a 390 CSS pixel viewport, navigation and page content remain operable.
- Typed request errors do not cause a switch to demo data or a blank screen.
- The six standard checks pass, with browser tests for navigation and viewport.

## P03: pages and structure workspace

Suitability: lower-cost model for a read-only, fixed-contract implementation.

Depends on P02. Read [the structure requirements](product.md#pages-and-structure)
and [the page index contract](api.md#page-index).
Own `apps/web/src/features/structure/**` and its tests only.

Implement `StructurePage({client, initialView})`. Include outline and inventory views, text
search, status and tag filters, selected-page inspection, and incoming and
outgoing dependency lists. The inspector keeps source path, parent, identity,
and public URL separate. The initial published URL may be unknown.

Render nested parentage from validated summaries. Do not infer parentage from
folders or titles. Display source-only include dependencies as source files.
Keep compiler edges in their documented direction. Do not build a force-directed
graph, source editor, reparenting engine, or fake drag-and-drop mutation.

Read-only controls explain their limits. Selecting a page does not save it.
Stale data names both the source revision and the earlier graph revision.
An unsupported producer is different from a site containing no pages.

Acceptance:

- Both root trees and the complete deep chain remain visible and navigable.
- Search and combined filters select the expected fixture pages.
- A folder whose name resembles a section does not acquire parentage.
- Source-only include files never appear as pages.
- Keyboard users can change views, select a page, and reach its inspector.
- Empty, stale, unavailable, unsupported, and request-error scenarios render
  distinct useful states.
- Unit and component tests assert visible behavior. The six standard checks pass.

## P04: Site Readiness workspace

Suitability: lower-cost model for presentation and fixed demo interactions.

Depends on P02. Read [the readiness inventory](product.md#website-readiness-inventory)
and [the observation contract](api.md#readiness).
Own `apps/web/src/features/readiness/**` and its tests only.

Implement `ReadinessPage({client})`. Group the initial readiness keys, filter by
attention needed, and show an item detail panel. Explain purpose, applicability,
configuration, generation, deployment, the last observation, and the next action.

Distinguish unknown from not applicable. Explain that robots rules do not provide
privacy, analytics is optional, `llms.txt` is a proposal, and security contact
files differ from policy pages. Do not invent required `cyborgs.txt` checks.

The first implementation is read-only. Setup and run actions explain that the
backend is not connected. Do not install scripts, generate files, open provider
accounts, or turn a click into a fake successful check.

Acceptance:

- Generated-only data is not labeled deployed or verified.
- Older passed evidence is visibly stale for the displayed release.
- Missing evidence cannot produce a passing check.
- Failures, manual review, not-applicable items, and request errors remain distinct.
- Item detail and filters work with a keyboard at desktop and 390 CSS pixels.
- The six standard checks pass. Tests inspect the visible states above.

## P05: prototype integration and review

Suitability: higher-reasoning integration and product review.

Depends on P02, P03, and P04. Own application composition, HTTP-client
boundaries if present, and end-to-end scenarios. Coordinate any fixes that touch
a feature owner's files. Do not start duplicate review agents for small fixes.

Exercise the real demo entry point, not only isolated components. Select pages,
inspect references, switch views, filter readiness tasks, and inspect evidence.
Run every named scenario. Verify that errors do not display plausible empty
data or fabricated success. Check keyboard operation and responsive layout.

Acceptance:

- All six standard commands pass from a clean install.
- An end-to-end test covers a page selection and its dependency details.
- Another covers generated-but-unverified and stale readiness evidence.
- Prototype limits are explicit, and no production claims or fake metrics appear.
- The report names remaining gaps and screenshots captured by browser tests.
  Screenshots supplement, rather than replace, behavioral assertions.

## P06: real compiler adapter proof

Suitability: higher-reasoning implementation. This is not initial grunt work.

Depends on P01 and the binary-provenance gate. Read
[the integration specification](boris-integration.md) and its pinned upstream
contracts. Own `apps/server/src/boris/**`, `test/boris/**`, provenance records,
and the `test:boris` root script. Coordinate root changes with the dependency owner.

Acquire the agreed compiler kit. Do not use the dirty local `0.8.2` binary as
proof of `0.9.0` support. Capture a small hand-authored source tree and actual
producer artifacts in tests with their binary digest and source revision.
Do not commit the binary or rewrite golden artifacts to resemble demo records.

Implement fixed argv-array operations and boundary adapters. Run inside unique
temporary workspaces. Do not expose compiler execution over HTTP in this packet.

Acceptance:

- Real runs cover valid nested pages, references, a source-only include, and a
  content failure after an earlier success.
- Missing or stale artifacts and unknown producer versions are not accepted.
- An unsupported profile declaration remains visible instead of being dropped.
- A draft fixture demonstrates that default HTML output is not privacy.
- Timeout, output overrun, termination, and cleanup tests use a controlled
  executable stub. Real compiler tests still run separately.
- Source bytes remain unchanged. A failed run cannot produce a current valid
  graph from old files.
- `BORIS_BIN=/absolute/path/to/pinned/boris npm run test:boris` passes.
  Missing or wrong binaries fail this explicit command rather than silently skip.
- The report separates real compiler evidence from stub-based process tests.
