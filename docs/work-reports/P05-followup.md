# P05 follow-up: corrective pass for the reviewed first pass

Date: 2026-11-08. Branch: `m0-second-pass` (cut from `m0-prototype` at `e4560ba`).
Input: [the first-pass review](../../.cache/reviews/e4560ba-first-pass.md).

All four reviewed findings were reproduced before fixing, then fixed, then
covered by focused behavioral regression tests. One scoped commit.

## Reproduction before fixing

A temporary probe file (deleted after use) reproduced each finding
deterministically:

- **F1** — rendered the `empty` Structure workspace and waited for the exact
  timing window: Astryx's shared polite live region
  (`[data-astryx-live-region="polite"]`, appended to `document.body` by
  `EmptyState`'s announcement hook) received the empty-state text one frame
  after mount and held it for ~2 s. Inside that window the unscoped global
  `getByText(/different from an unavailable or unsupported producer/)` threw
  "found multiple elements", while a workspace-scoped query found exactly the
  visible copy. This is the mechanism behind the reviewed full-suite flake
  (113 passed / 1 failed on the reviewer's clean `npm ci`; not reproducible on
  every local run because it is timing-dependent — 6 local full-suite runs
  passed before the fix).
- **F2** — collapsed Field guides with ArrowLeft (`aria-expanded="false"`),
  searched "Ferns of the valley": the matching descendant did not render
  ("Unable to find an element with the text").
- **F3** — a Cmd-click on Readiness navigated the current tab
  (`?workspace=readiness…` instead of staying on `?workspace=structure…`).
- **F4** — a schema-valid optional analytics item with `not_configured`, no
  generated or deployed artifacts, and a current evidence-backed human
  `not_applicable` observation returned `needsAttention() === true`.

## Fixes

| Finding | Locus | Change |
| --- | --- | --- |
| F1 | `apps/web/src/features/structure/structure.test.tsx` | Empty-state assertions are scoped to the rendered workspace container (`within(container)`); a permanent regression test waits for the announcement window and asserts the workspace holds exactly one visible copy. Banner queries need no change: `Banner` does not mirror text into the live region (verified in the installed Astryx source). |
| F2 | `apps/web/src/features/structure/OutlineView.tsx` | TreeList is keyed by a deep signature of the visible outline's nested shape (`outlineShapeKey`). Astryx TreeList seeds expansion from `isExpanded` but keeps every user toggle in internal state that permanently outranks the seed, so a branch collapsed before a search would stay collapsed over a revealed match. When the visible set changes, the key remounts TreeList and reseeds every branch open; when it is unchanged, the key is stable and ordinary collapse state persists across selection changes. Parentage logic is untouched. |
| F3 | `apps/web/src/shell/AppNavigation.tsx` | Activation is intercepted only when `isPlainPrimaryActivation` holds (button 0, no meta/ctrl/shift/alt). Modified activations keep the native anchor (SideNavItem renders a real `<a href>`; verified it does not preventDefault for non-collapsible items). |
| F4 | `apps/web/src/features/readiness/attention.ts` | For `not_configured` items, a complete `not_applicable` observation whose subject still matches the displayed revision/release (i.e. not stale per `observationStaleness`) is honored as an opt-out and returns false. Missing decisions, stale opt-outs, needs_review, failures, and check errors remain actionable. |

### Documented judgment call (F4)

The opt-out is honored regardless of the observation's `method` because the
schema already makes every complete observation evidence-backed and the
decision's applicability is what matters, not who recorded it. A current
`passed` verdict on a `not_configured` item is treated as still needing
attention (setup is owed; `passed` on an unconfigured item is contradictory
data the demo never produces). This is recorded here rather than silently
decided.

## Regression tests added

Unit (`npm test` runs them):

- `structure.test.tsx`: search reveals a match under a branch collapsed by
  keyboard; narrowed filters keep it; clearing widens; a second search works;
  ordinary collapse persists across selection changes when no filter changes
  the visible outline (F2). Empty-state assertions scoped to the workspace and
  the announcement-timing regression test (F1).
- `AppNavigation.test.tsx` (new): plain click intercepts and navigates;
  keyboard Enter intercepts; meta/ctrl/shift/alt clicks and middle/auxiliary
  buttons are left native (F3).
- `App.test.tsx`: a Cmd-click on Readiness leaves the current tab on
  Structure and the real href stays on the anchor (F3, app level).
- `readiness-logic.test.ts`: the current human `not_applicable` opt-out on an
  unconfigured optional item is honored; stale opt-out, missing decision,
  needs_review, failed, and errored checks stay actionable — all built through
  `ReadinessItemSchema` (F4).
- `readiness.test.tsx`: the attention count and the "Needs attention" filter in
  the rendered workspace exclude an opted-out item (10 of 14 instead of 11),
  while the item stays listed under "All items" and inspectable with its
  recorded verdict (F4, interface level).

Browser (`npm run test:e2e` runs them):

- `structure.e2e.ts`: collapse → search → narrowed filter → clear → second
  search at desktop width, the same flow at a 390 px viewport, and the
  strengthened keyboard test: focus walks down to the named fern row with
  ArrowDown, Enter activates it, and the inspector asserts the new identity
  (`ent-ferns` present, `ent-home` absent) instead of merely existing (F2,
  keyboard review note).
- `shell.e2e.ts`: ControlOrMeta-click opens a new tab whose URL preserves
  `scenario`, while the original tab stays on Structure; browser back/forward
  follow the workspace history (F3). The Publish empty-state assertion is
  scoped to the empty state carrying the heading instead of a blind
  `.first()` (same root cause as F1).
- `m0-scenarios.e2e.ts`: the empty-site description assertion likewise scoped
  to its empty state (same root cause as F1).

Test-harness note: clicking a `treeitem` element clicks the center of its
bounding box, which spans the expanded subtree, so row clicks in tests target
the row's label text (as the pre-existing tests already did).

## Exact commands and results

Toolchain: repository-local Node `24.22.2` (`.tooling/node`) first on PATH,
npm `11.19.1` (not the Bun shim on the default PATH).

| Command | Result |
| --- | --- |
| `npm ci` | Pass, 506 packages installed (the npm-reported ESLint deprecation warning is pre-existing) |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass, 129 tests / 12 files (was 114) |
| `npm test` × 4 fresh processes | Pass each time, 129 passed |
| Announcement-timing test × 5 isolated runs | Pass each time (exercises the window behind the flake) |
| `npm run build` | Pass (pre-existing bundle-size warnings unchanged) |
| `npm run test:e2e` | Pass, 28 browser tests (was 24) |

## Acceptance evidence

- Empty, unavailable, unsupported, and request-error Structure states keep
  their distinct visible states and assertions; announcements are untouched.
- Collapse → search → narrow → clear → search again is covered at unit and
  browser level, including at 390 px; parentage and normal expansion are
  asserted unchanged.
- Modified click opens a new tab preserving the scenario parameter; the
  original tab does not navigate; ordinary click, Enter, and back/forward
  still work.
- A current evidence-backed opt-out no longer demands setup; missing, stale,
  failed, errored, and needs-review decisions still do — asserted on the
  helper and on the workspace's attention count and filter.

## Known gaps

- The bundle-size and dependency-annotation build warnings and the npm
  ESLint deprecation notice are pre-existing and out of scope for this pass.
- Time-based staleness expiration remains deliberately unimplemented (per
  `docs/api.md#readiness`, it follows a later checker-specific policy).
- The demo scenarios are unchanged; the opt-out UI test builds its valid-data
  variant through the shared schemas on top of the populated fixture.
