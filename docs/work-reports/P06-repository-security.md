# P06 follow-up: public repository and security safeguards

Date: 2026-11-08. Owner-authorized follow-up on
`drawmeanelephant/obsequicms`. Branch: `chore/repository-security`, based on
`33f35a0cab531ff0d95c3984430cee49e3842184`. No other agents were launched.

## Repository settings applied and read back

- Visibility is **public**, default branch `main`. This supersedes the
  initial private-source publication decision; it does not deploy the app.
- `main` requires PRs, up-to-date `verify` checks from GitHub Actions
  (app ID 15368), and resolved conversations. Admins are subject to protection.
  Force pushes and deleting `main` are disabled.
- The sole collaborator is the owner. Independent approvals are deliberately
  zero so the owner is not locked out of their own PRs; stale approvals are
  dismissed. Add an independent-review requirement when another maintainer
  is appointed.
- Merge commits are enabled; squash/rebase merges are disabled to preserve
  history. Automatic merged-head deletion, branch updates, and opt-in
  auto-merge are enabled. No bot auto-merge rule is installed.
- Secret scanning and push protection are enabled. No open secret alerts
  were returned at verification time.
- Dependabot alerts and unpaused security updates are enabled. The dependency
  graph endpoint returns an SBOM.
- GitHub private vulnerability reporting is enabled and documented.
- Actions are limited to GitHub-owned actions, full commit SHAs are required,
  default workflow permissions are read-only, and workflow PR approval is
  disabled. All external-contributor fork workflows require approval.

These facts were verified by a local script using the repository, branch
protection, Actions permissions, Dependabot, private-reporting, dependency-graph,
and secret-alert REST endpoints. The verifier is outside the source tree at
`/tmp/obsequicms-security.LA9cAu/verify-settings.py`.

Optional non-provider secret patterns remained disabled after the API request,
so they are **not** claimed enabled. Secret validity checks also remain
disabled. No paid product, billing setting, account-wide setting, credential,
webhook, deployment, or package publication was added.

## Source changes in this PR

- `.github/workflows/ci.yml`: retains all existing gates, adds read-only
  permissions, non-persistent checkout credentials, job timeout, concurrency
  cancellation, and full commit pins instead of moving action tags.
- `.github/workflows/codeql.yml`: scans JavaScript/TypeScript and Actions on
  PRs, pushes to `main`, a weekly schedule, and manual dispatch. Uses
  `security-extended` queries and no build execution. Only this analysis job
  requests `security-events: write`.
- `.github/workflows/dependency-review.yml`: fails PRs that introduce known
  high or critical dependency vulnerabilities, without inventing a license
  policy or requesting PR write permission.
- `.github/dependabot.yml`: bounded weekly npm and Actions update PRs.
  Dependencies are not upgraded in this change; future PRs use the same gates.
- `.github/PULL_REQUEST_TEMPLATE.md`: asks for scope, real verification,
  and security considerations without soliciting private material.
- `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/decisions.md`: document
  public source, private reporting, solo-maintainer rules, and the limits of
  scanning. No license or production-readiness claim is introduced.
- `docs/work-reports/P06-repository-security.md`: this report.

Action pins were resolved through GitHub's tag references (dereferencing the
annotated CodeQL tag) to actual commits:

| Action | Revision |
| --- | --- |
| `actions/checkout` v4 | `11d5960a326750d5838078e36cf38b85af677262` |
| `actions/setup-node` v4 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `actions/upload-artifact` v4 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| `actions/dependency-review-action` v5.0.0 | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` |
| `github/codeql-action` v4 | `33d7b85da1a04171e211befe2c739303b9a4c066` |

## Exact local validation

Exported staged tree `c32028f346df67662cd7c4fda65a9308f93397d0` using
`git archive` to `/tmp/obsequicms-security.LA9cAu/clean`, without ignored
project state. Selected Node `24.22.2`, real npm `11.19.1`, and the existing
approved Darwin-arm64 compiler were external prerequisites. Tests and screenshot
generation stayed in that export. Logs: `/tmp/obsequicms-security.LA9cAu/logs`.

| Command | Result |
| --- | --- |
| `actionlint .github/workflows/*.yml` (1.7.12) | Exit 0, all three workflows |
| `npm ci` | Exit 0, 506 packages |
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0, all workspaces |
| `npm test` | Exit 0, 192/192 |
| `npm run build` | Exit 0 |
| `CI=1 npm run test:e2e` | Exit 0, 28/28 |
| `BORIS_BIN=/tmp/obsequicms-boris-kit/boris-agent-kit/bin/boris npm run test:boris` | Exit 0, 14/14, unchanged digest enforcement |
| `python3 /tmp/obsequicms-security.LA9cAu/verify-settings.py` | Exit 0, applied settings match the policy |
| `git diff --check` | Exit 0 |

No application, compiler, root dependency, lockfile, or existing test source was
changed. Existing dependency deprecation, build-size/annotation, jsdom
navigation, and React `act` warnings remain visible and non-fatal.

## Remote acceptance boundary

Local validation does not prove the new security workflows have run. This PR
must run on GitHub; successful observed security-check names can then be added
to the required checks alongside `verify`. New CodeQL scans are evidence only
after a real analysis upload, not merely because a YAML file exists.

The initial private-repository CI attempt was blocked before any steps by an
account payment/spending restriction. Public-runner results for this follow-up
are reported in the PR and final handoff; no account setting is changed to
work around a failure, and protection must not be bypassed to merge.

Remaining owner decisions include the project license, a second maintainer
for independent review, and the previously documented compiler distribution
and Linux provenance. The next product packet remains **M1: connect one real
project, read-only**. Public source and repository safeguards do not implement
the connected backend or authorize public application hosting.
