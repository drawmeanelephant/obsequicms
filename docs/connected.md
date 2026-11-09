# Connected read-only M1

M1 connects one explicitly selected local Boris project. It is not a demo-data
adapter and is not approved for public hosting. No authentication, source save,
preview transport, publishing, or provider connection is implemented.

## Start locally

Use the repository's Node 24 and real npm 11. Obtain and verify a kit listed in
[the binary provenance guide](boris-binary.md); do not choose a binary from PATH
or fetch one during startup.

From the repository root:

```sh
npm ci
npm run build
```

Terminal 1:

```sh
OBSEQUIOUS_PROJECT_ROOT=/absolute/path/to/a/boris/project \
BORIS_BIN=/absolute/path/from/an/approved/kit/bin/boris \
npm run dev:server
```

Terminal 2:

```sh
npm run dev:connected
```

Open `http://127.0.0.1:5173/`. This command redirects to the separate
`connected.html` entry. **Real data · read-only M1** and the captured source
revision distinguish it from `npm run dev:demo`. Both web modes use the same
port, so run one at a time. Stop both processes with Ctrl-C.

Alternatively, run the built backend with the same two environment variables:

```sh
node apps/server/dist/index.js
```

Project/executable paths must be absolute. The server reads its process
environment directly; `.env.example` is documentation, not an automatic loader.
Without `OBSEQUIOUS_PROJECT_ROOT`, it exposes health only. A non-default
backend `PORT` must be paired with `OBSEQUIOUS_API_PORT` for the web proxy.
Both listeners and the proxy target stay on loopback. Do not tunnel, publicly
reverse-proxy, or deploy this unauthenticated transport.

For testing, first copy a hand-authored sample into a disposable directory,
then explicitly select that directory. Never mutate an owner's real content
to create a failure scenario.

## What works

- Pages/Structure display compiler identities, titles, parents, authored
  statuses/tags, and parent/reference/include edges. Filesystem placement does
  not determine parentage; source-only includes do not become pages.
- `GET /api/v1/pages` captures a fresh isolated snapshot, optionally validates
  its profile, runs the real compiler index and graph check, and returns the
  supported PageIndex projection. Check findings are informational; they are
  not live website-readiness checks.
- A content failure returns an **unavailable** graph with the fresh report's
  located diagnostics, not an earlier valid graph. Remediation is kept as
  `Next step:` text in the existing problem message. Reload after an external
  source repair to capture another revision.
- Unsupported profiles and producer versions return **unsupported**, distinct
  from an empty valid site. Transport/process failures are typed errors, never
  empty or demo data.
- `GET /api/v1/source` reads exact UTF-8 from a retained snapshot, including
  original LF/CRLF/BOM bytes, with its SHA-256. Invalid UTF-8 is refused rather
  than replaced. The existing inspector displays the selected page's raw source
  for a current graph, never an alternative Markdown rendering.
- `GET /api/v1/site` names the selected project and snapshot. Published URLs and
  the active release stay unknown until authoritative release data exists.

## Containment and limits

The browser cannot select a project root, executable, flags, or working directory.
Only known regular Markdown paths below the captured `content/` tree can be
read. Traversal, absolute paths, symlinks, unknown paths, and unknown/expired
revision IDs are refused. Source reads recheck the private snapshot, including
symlinks planted after compilation.

Snapshots exclude root-level generated directories and environment files.
Initial bounds are 64 MiB of copied inputs, 4096 files, 64 nested directories,
and 8 MiB per input file. Four snapshot revisions are retained in this process;
expiry and shutdown delete only owned job workspaces. Existing source requests
remain tied to their exact captured revision. Restart does not preserve them.

**The 8 MiB raw-source limit is not the compiler's page limit.** Pinned Boris
accepts parsed page source up to **1 MiB**. Larger pages produce its real
`EFRONTMATTER` size diagnostic. The raw-source API can still inspect captured
UTF-8 up to 8 MiB; it does not declare that content valid or work around Boris.

## Checks

The six standard repository checks still exercise the separate demo and the
unit/component boundaries. Real integration requires the approved kit:

```sh
BORIS_BIN=/absolute/path/to/approved/boris npm run test:boris
BORIS_BIN=/absolute/path/to/approved/boris npm run test:connected
```

Both commands fail without an approved binary; they do not silently skip or
substitute fixtures for compiler requests. The connected browser gate starts
the built native Node server against its own disposable authored project and
real Chromium. It covers source/relationships, CRLF fidelity, navigation,
content failure/repair, unsupported IR, and actual backend outage/recovery.

## Still outside M1

Readiness, Editor, Media, Analytics, Publish, and Settings remain explanatory
placeholders. No save, job-creation, session, or provider endpoint exists.
Full impact inspection and source-only include navigation remain unwired in
the UI, although the adapter/source API support the underlying data.

The P05 review's investigation-context loss and remote mobile detail layout are
not fixed by connecting data. Diagnostic line/column are visible, but there is
still no clickable source-line navigation. These are subsequent read-only
usability work, not permission to implement editing or publication.
