# Initial API contracts

Status: shared contracts implemented; private read-only M1 implements only
`GET /api/v1/health`, `GET /api/v1/site`, `GET /api/v1/pages`, and
`GET /api/v1/source`. All other listed endpoints remain planned and absent.
Demo clients implement the same TypeScript interface without network calls.
The separate connected composition never imports demo records.

M1 is an explicit **loopback-only, unauthenticated development exception** to
the planned owner-session requirements below. It must not be deployed,
tunneled, or reverse-proxied publicly. Project and executable selection are
server configuration, not request fields. See [connected mode](connected.md).

Application fields use camelCase. Forwarded Boris artifacts retain their
original field names, discriminators, and versions.

## Common values

- `SourceRevision`, `JobId`, `ReleaseId`, and `EvidenceId` are distinct opaque
  string types. The server creates filesystem-safe UUID values for its own IDs.
- `EntityId` is opaque compiler text. It is not a filesystem path or URL.
- `SourcePath` is a validated project-relative author-owned path. Initial
  editing accepts known regular Markdown files below `content/`.
- `FileHash` is the lowercase SHA-256 of the exact source bytes.
- Timestamps are UTC ISO 8601 strings. Unknown facts are `null`, not invented
  defaults.
- API request schemas reject unknown fields. Filesystem paths and process
  controls never become browser-supplied capabilities.

An error response is `{error: {code, message}, requestId}`. Initial error codes
are `unauthenticated`, `forbidden`, `invalid_request`, `not_found`, `conflict`,
`unsupported`, and `unavailable`. Compiler content problems remain structured
job results, not generic server errors.

The client uses an `ApiError` class with `code`, `message`, and `requestId`.
All client methods return promises. Failures reject with `ApiError`, rather
than returning an error as a successful document. Client-side errors without a
server request have a null request ID.

## Page index

A `PageSummary` contains:

```text
entityId: EntityId
title: string
sourcePath: SourcePath
parentId: EntityId | null
role: "trunk" | "satellite"
status: "draft" | "published" | "archived" | null
tags: string[]
publishedUrl: string | null
```

Trunk records require a null parent. Satellite records require a parent ID.
The title is the compiler's resolved display title. The application does not
parse a second title from source. An unset authored status remains `null`.
Published URLs remain `null` until a release provides an authoritative route
mapping. They are not guessed from entity IDs.

A `PageIndex` contains `sourceRevision`, `graphRevision`, `state`, `pages`,
`dependencies`, and `problems`. Its state is:

- `current`: `graphRevision` equals `sourceRevision`.
- `stale`: `graphRevision` names an earlier valid revision.
- `unavailable`: no valid graph exists and `graphRevision` is `null`.
- `unsupported`: the producer format is unsupported and no current graph is
  presented as valid.

For `unavailable` and `unsupported`, `graphRevision` is `null`, and `pages` and
`dependencies` are empty. Stale data requires a non-null earlier graph revision.
These are explicit response variants, not a flag attached to arbitrary arrays.

Each dependency is `{kind, from, to}` with kind `parent`, `include`, or
`reference`. Each endpoint is either `{type: "page", entityId}` or
`{type: "source", sourcePath}`. Their direction is the compiler's direction.
Semantic relations remain separate forwarded compiler data in a later addition.
Do not turn source-only include endpoints into pages.

Each problem contains `severity`, `code`, `message`, `sourcePath`, `line`,
`column`, and `origin`. Severity is `error`, `warning`, or `info`. Unknown
locations and unknown codes are `null`. Origin is `compiler` or `process`.
Locations are project-relative. HTML is never embedded in diagnostic messages.

## Source and jobs

A `SourceBuffer` contains `path`, `sourceRevision`, `fileHash`, and `content`.
The content is UTF-8 source with its original line endings. The initial limit
is 8 MiB per source file, measured in UTF-8 bytes.
This is a source-buffer bound, not a promise that Boris accepts an 8 MiB page:
the pinned Boris parser has a separate 1 MiB page-source limit. M1 preserves
that compiler refusal and can still return the exact retained raw source.

A `SaveSourceRequest` contains `path`, `expectedSourceRevision`,
`expectedFileHash`, and `content`. A successful save returns a `SourceBuffer`
with the new revision. A mismatch returns HTTP 409 without replacing source.

A `StartJobRequest` contains `kind` and `sourceRevision`. Initial kinds are
`validate`, `index`, and `preview`. Future publication jobs are not accepted
under an arbitrary string escape hatch.

A `Job` contains `id`, `kind`, `sourceRevision`, `state`, `startedAt`,
`finishedAt`, and `result`. States are the six states in
[the architecture](architecture.md#jobs-and-releases).
Queued jobs have null timestamps and results. Running jobs have `startedAt`
but no `finishedAt` or result. Every terminal state has `finishedAt` and a
result. Cancelled or interrupted jobs have a terminated outcome and may have
no start time. A completed result has:

```text
outcome: "success" | "content" | "usage" | "io" | "terminated"
exitCode: number | null
problems: Problem[]
artifacts: {kind: string, evidenceId: EvidenceId}[]
```

An artifact reference is a server-owned record, never an arbitrary client path.
Artifact access and expiration are explicit server operations.
Succeeded jobs require a success outcome and exit code 0. Failed jobs require
a non-success outcome. These constraints are part of the boundary schemas.

## Readiness

A `ReadinessItem` contains `key`, `label`, `category`, `configuration`,
`generated`, `deployment`, `observation`, and `action`.

- Initial keys are `robots`, `sitemap`, `canonical`, `social_preview`, `llms`,
  `humans`, `security_contact`, `about`, `contact`, `privacy`,
  `google_search_console`, `bing_webmaster`, `analytics`, and `image_alt`.
- Category is `discovery`, `identity`, `measurement`, or `trust`.
- Configuration is `not_configured` or `configured`.
- `generated` is `null` or `{sourceRevision, evidenceId}`.
- `deployment` is `null` or `{releaseId, evidenceId}`.
- Action is `{kind, label, target}`. Kind is `manual_setup`, `open_page`,
  `run_check`, or `none`. Target is a validated identifier or `null`, not an
  executable URL or source of HTML.

`observation` is a discriminated union:

| Status | Additional fields |
| --- | --- |
| `not_checked` | None |
| `running` | `jobId` |
| `complete` | `verdict`, `evidenceId`, `method`, `observedAt`, `subject` |
| `error` | `code`, `message` |

A complete verdict is `passed`, `failed`, `needs_review`, or `not_applicable`.
Method is `compiler`, `live_http`, `provider`, or `human`. Subject contains
nullable `sourceRevision`, `releaseId`, and `url`, with at least one present.
There is no passed observation without evidence. Staleness is derived by
comparing the observation's subject to the displayed revision or release.
Time-based expiration follows a later checker-specific policy.

The prototype has no checker registry or pretend crawler. Its observations are
synthetic examples under a persistent demo label.

## HTTP and client interface

Except for health and the session bootstrap operations, real endpoints require
an owner session. Source saves and job creation also require an
`Idempotency-Key` header. Login and all mutations receive origin protection.

| Method | Path | Request and response |
| --- | --- | --- |
| GET | `/api/v1/health` | Minimal `{status: "ok"}` without paths or secrets |
| GET | `/api/v1/session` | `{authenticated: boolean}` |
| POST | `/api/v1/session` | Credentials, then an owner-session cookie |
| DELETE | `/api/v1/session` | Revoke the session, then HTTP 204 |
| GET | `/api/v1/site` | `{name, sourceRevision, activeReleaseId}` |
| GET | `/api/v1/pages` | `PageIndex` for the current source revision |
| GET | `/api/v1/source` | Query `path` and `sourceRevision`, then `SourceBuffer` |
| PUT | `/api/v1/source` | `SaveSourceRequest`, then `SourceBuffer` |
| POST | `/api/v1/jobs` | `StartJobRequest`, then HTTP 202 with `{jobId}` |
| GET | `/api/v1/jobs/:jobId` | `Job` |
| GET | `/api/v1/readiness` | `{sourceRevision, releaseId, items}` |

P01 exports `SiteSummary` for the site response, `ReadinessIndex` for the
readiness response, and `ObsequiousClient` with these signatures:

```typescript
getSite(): Promise<SiteSummary>;
getPages(): Promise<PageIndex>;
getReadiness(): Promise<ReadinessIndex>;
getSource(request: {path: SourcePath; sourceRevision: SourceRevision}): Promise<SourceBuffer>;
saveSource(request: SaveSourceRequest, idempotencyKey: string): Promise<SourceBuffer>;
startJob(request: StartJobRequest, idempotencyKey: string): Promise<{jobId: JobId}>;
getJob(jobId: JobId): Promise<Job>;
```

`SiteSummary` has a string `name`, a `SourceRevision` source revision, and a
nullable `ReleaseId` active release. `ReadinessIndex` has a `SourceRevision`
source revision, a nullable `ReleaseId` release, and `ReadinessItem[]` items.
Their exact camelCase property names are the response fields in the table.

The client has a readonly `mode` property of `demo` or `connected`.
P01 supplies a demo implementation. P06 and later implementation work supply
the real server and HTTP adapter. A connected failure never changes that mode.

## Prototype composition

P02 gives `App` an injected `client: ObsequiousClient`. The demo entry creates
that client explicitly. A connected entry does not import demo scenarios.

M1's `connected.html` constructs a same-origin HTTP client. Failed transport,
malformed responses, and unsupported producers never change its connected
mode. Connected navigation preserves that entry path and does not add demo
scenario parameters. Unimplemented workspaces explain their limits.

`StructurePage` accepts `client` and an optional `initialView` of `outline` or
`inventory`, defaulting to `outline`. `ReadinessPage` accepts `client`.
The shell remounts the feature when the workspace changes.

The demo uses query parameters `workspace` and `scenario`. Workspace is one of
`pages`, `structure`, `editor`, `media`, `readiness`, `analytics`, `publish`,
or `settings`. Pages opens the inventory. Structure opens the outline.
Scenario is one of the six named scenarios in P01. Both default to Structure
with populated data. Navigation preserves the selected scenario.

Browser tests use `*.e2e.ts`. P00's Playwright configuration discovers those
files in `apps/web/e2e` and feature test folders. Vitest excludes them.
This lets feature workers add browser checks without editing shared test files.
