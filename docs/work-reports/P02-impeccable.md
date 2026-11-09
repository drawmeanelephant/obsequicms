# P02 follow-up: Impeccable visual cleanup

## Scope and changed files

This is an Operate-mode refinement of the existing Astryx application, not
a replacement design system or a connected-backend packet.

- `apps/web/src/App.tsx`: use Astryx's documented elevated shell variant and
  show the current workspace in its documented top-navigation end slot.
- `apps/web/src/index.css`: extend the neutral theme's published semantic
  tokens in light and dark modes; group filters; distinguish the inspector;
  replace readiness card outlines with rows; quiet routine status labels;
  improve type hierarchy, wrapping, keyboard focus, and phone controls.
- `apps/web/e2e/layout.e2e.ts`: 17 repeatable layout, interaction, keyboard,
  theme, rendered-line-length, and computed-color contrast checks.
- This report.

The compiler, contracts, feature modules, fixtures, dependencies, generated
theme module, and factual copy are unchanged. Demo labels and unsupported
states remain visible. No services were connected and nothing was published.

## Design evidence

Used the neighboring `/Users/tbuddy/dev/impeccable` checkout's installed
skill, its `context` command, and its polish, Operate, and craft-floor
guidance. Consulted the installed Astryx 0.7.11 documentation for AppShell,
TopNav, Theme, SideNav, Section, and Badge rather than inventing APIs.

The incumbent side navigation, outline/inventory views, feature boundaries,
and task flow remain. Color marks selection and exceptional status, not
every normal row. Container queries split the inspector only when the
workspace itself has room, including the space occupied by navigation.

Inspected the original browser-test screenshots and final production-build
captures of desktop Structure, dark Readiness, and phone Structure.
The new tests retain final captures under ignored `test-results/` directories,
named `workspace.png` and `theme.png`. Existing tracked P05 screenshots were
restored after tests regenerated them; no binary changes belong to this diff.

## Exact commands and results

All npm commands used Node `v24.22.2` and real npm `11.19.1` with:

```sh
export PATH="/Users/tbuddy/dev/obsequicms/.tooling/node/bin:$PATH"
```

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0 during the preceding local-server setup in this session; 488 packages installed. No dependency files changed afterward. |
| `npm run test:e2e` before edits | Exit 0, 28 existing browser tests. |
| `npm run lint` | Final exit 0. |
| `npm run typecheck` | Final exit 0 across all three workspaces. |
| `npm test` | Final exit 0, 192 tests in 16 files. |
| `npm run build` | Final exit 0 for server and web. |
| `npm run test:e2e -- apps/web/e2e/layout.e2e.ts` | Exit 0, 17 focused checks before the final follow-up refinements. |
| `npm run test:e2e` after the final edit | Exit 0, all 45 tests, including all 17 new checks. |
| `git diff --check` | Exit 0 after source changes. |

New checks exercise actual page selection and dependency details in Structure
and Pages, and generated-but-unverified evidence in Readiness, at 390, 768,
1024, and 1440 CSS pixels. They require no document/main horizontal overflow,
stacked details at narrower sizes, side-by-side details at 1440px, and no
rendered description line above 80 characters. The mobile scenario selector
has visible keyboard focus and a target at least 44px high.

Readiness is also exercised in light and dark modes at 390 and 1440px with
reduced motion enabled. Its description, demo notice, item labels, and status
labels meet 4.5:1 computed-color contrast against their composited backgrounds.
Those four cases also assert no browser page errors.

During iteration, the first new layout check incorrectly queried an HTML
`main` tag instead of Astryx's main landmark. It was corrected to use the
accessible role. Type checking also caught unchecked array indexing in the
new contrast helper; a reduction replaced that indexing. Neither check's
acceptance threshold was weakened.

## Impeccable detector

Ran the requested manual scan once, after the initial refinement:

```sh
DO_NOT_TRACK=1 /Users/tbuddy/dev/impeccable/.agents/skills/impeccable/scripts/impeccable detect --json \
  /Users/tbuddy/dev/obsequicms/t3-04b6e3ce/apps/web/src/App.tsx \
  /Users/tbuddy/dev/obsequicms/t3-04b6e3ce/apps/web/src/index.css \
  http://127.0.0.1:5173/ \
  'http://127.0.0.1:5173/?workspace=pages' \
  'http://127.0.0.1:5173/?workspace=readiness'
```

Exit 2: five primary warnings and two advisories, all on rendered URLs.
Raw output is retained locally in `.cache/impeccable-polish.json`.

- Three line-length warnings led to narrower description measures and
  `text-wrap: pretty`. The final browser suite directly checks rendered line
  lengths against the 80-character limit for all three workspaces at all
  four tested widths.
- Two unequal-column warnings describe the intentionally independent page
  list and long inspector. Details remain scrollable with the main workspace
  instead of clipping source, hiding dependencies, or introducing another
  nested scrolling region just to balance column height.
- Advisory em-dash density concerns preserved factual copy. Advisory
  paragraph straggling motivated pretty wrapping.

No rule ignores were added. The detector was not rerun after these follow-up
fixes, as its playbook requests one manual pass. This is not a clean-detector
claim; the independent final browser assertions are the evidence for the
line-length repair.

## Remaining limits

- This is still a read-only demo. Saving, publishing, authentication, and
  connected data remain outside scope.
- Existing build warnings remain: Zod annotation handling and the large
  application chunk. Existing unit tests also emit React `act` and jsdom
  navigation warnings. All final commands above still exit successfully.
- This is not a complete accessibility audit or cross-browser certification.
  Checks use the repository's Chromium setup. No real compiler gate was run
  for this CSS and shell-only change.
- Impeccable reports legacy product context and an available v4.8.1 update.
  Neither was changed as a side effect. `/impeccable init` owns the context
  refresh; an explicitly requested `npx impeccable update` belongs in a later
  turn.

The local demo remains on `http://127.0.0.1:5173`.
