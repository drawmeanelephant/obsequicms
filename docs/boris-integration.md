# Boris integration

Status: P06 adapter and M1 private read-only integration verified against the
approved native kits. See [binary provenance](boris-binary.md) and the
[M1 report](work-reports/M1.md). Later authoring/publication sections remain
design constraints, not implemented features.

## Source of truth

The planning baseline uses Boris source revision
`c50d8622bd407bcb5f559a4d7ed5da440a2259ec`, which declares `boris/0.9.0`.

- [CLI contract](https://github.com/drawmeanelephant/boris/blob/c50d8622bd407bcb5f559a4d7ed5da440a2259ec/docs/contracts/cli.md)
- [IR contract and linked schemas](https://github.com/drawmeanelephant/boris/blob/c50d8622bd407bcb5f559a4d7ed5da440a2259ec/docs/contracts/ir-schema.md)
- [Frontmatter contract](https://github.com/drawmeanelephant/boris/blob/c50d8622bd407bcb5f559a4d7ed5da440a2259ec/docs/contracts/frontmatter.md)
- [Profile execution](https://github.com/drawmeanelephant/boris/blob/c50d8622bd407bcb5f559a4d7ed5da440a2259ec/docs/contracts/publication-profile.md)
- [Head metadata](https://github.com/drawmeanelephant/boris/blob/c50d8622bd407bcb5f559a4d7ed5da440a2259ec/docs/contracts/head-metadata.md)
- [Publication checks](https://github.com/drawmeanelephant/boris/blob/c50d8622bd407bcb5f559a4d7ed5da440a2259ec/docs/contracts/publication-checks.md)

Before integration tests, obtain a reviewed Boris binary or an upstream
`scripts/agent-pack.sh` handoff kit from the selected source worktree.
Record its SHA-256, version, build information, platform, and source revision.
Do not fetch and execute an unpinned binary during application startup.

An older local binary reported `boris/0.8.2` with
`vcsRevision: "1b0cb15d.dirty"` during planning. It is not accepted evidence for
this baseline. The approved Darwin and Linux kits instead use the clean pinned
source revision and separate exact digests. The real compiler gate does not
accept an arbitrary local binary.

## Fixed process operations

Every operation runs inside its own server-owned job workspace. The server
creates `.obsequious/` for fresh reports before invocation. The executable and
argv are server-owned. These fixed allowlisted operations are exercised by
the real compiler gate. M1 invokes identity, profile validation when present,
source indexing, and graph checks, not preview or publication:

| Operation | Argv after the executable |
| --- | --- |
| Identity | `--version`, then a separate `--build-info` invocation |
| Validate supported HTML profile | `validate --profile boris.json --report .obsequious/validate.json` |
| Index Markdown source | `build --input content --out .obsequious/ir` |
| Build preview artifacts | `build --profile boris.json --report .obsequious/html.json` |
| Graph health | `check --input content --format json --report .obsequious/check.json` |
| Impact | `impact <entity-id> --input content --format json --report .obsequious/impact.json` |

The initial supported workspace has Markdown under `content/`, one HTML target,
and no profile editions or llms declaration. Unsupported profile declarations
are reported, never silently stripped. Do not assume the `plan` command proves
that a profile can execute.

RSS has a bounded single-target enabled-head execution path. `validate --profile`
has narrower declaration support than `build --profile`. Test that asymmetry
against the pinned binary before enabling RSS in the application. Initial
workers must not add it to make a demonstration more impressive.

Continuous preview later uses `watch --profile boris.json --serve --watch-json`.
Its NDJSON machine stream is on stderr. Negotiate its hello record and supervise
shutdown. Profile changes require restarting the watcher.

Start with 120-second process deadlines and separate 16 MiB stdout and stderr
limits. These are application defaults to test, not performance claims.
Use fresh report paths and verify producer discriminators and versions.
An old report file is never evidence for a new run.

## Initial artifact support

The first adapter accepts base IR `schemaVersion: "0.2.0"` and completion
`format: "boris-completion-index", schema_version: 1`. It accepts the HTML
report version `html-build-report-0.2.0`.

It detects conditional IR `0.3.0` and `0.4.0`, and other unknown versions, as
unsupported until explicit adapter tests add support. It must not reinterpret
them as base IR or return an empty successful graph.
The UI preserves the difference between unsupported and an empty valid site.

On content failure, IR publishes a failure report without graph-dependent
artifacts. On process or I/O failure, output can be missing or partial.
M1 returns a fresh unavailable graph after a content failure and never reuses
old artifacts as current. Later persistent graph history may retain earlier
graphs only as explicitly stale data.

Exit outcomes are success for 0, content for 1, usage for 2, I/O for 3, and
terminated for a signal, timeout, overrun, or unexpected exit code.
Compiler identifiers are opaque strings. Base version and variant suffixes
must be handled according to the upstream contract, not substring matching.

## Source editing and structure

Frontmatter is a closed one-line grammar, not general YAML. The schema for its
parsed fields does not describe all source parsing rules. Do not use a YAML
serializer or round-trip a whole document to change one field.

Initial editing changes raw UTF-8 source. Structured title, parent, tag, or
status controls require a byte-preserving authoring adapter, candidate
validation, and LF and CRLF round-trip tests. Parent-only changes must not
rename source or change explicit identity.

The application raw-source limit is 8 MiB. Boris's pinned normative
`frontmatter.md` bounds parsed page source at 1 MiB. These limits are separate:
M1 displays the real located size refusal and does not increase, bypass, or
reimplement the compiler's parser. Raw retained UTF-8 source remains readable
through the source API up to the application limit.

The initial UI reads compiler summaries and graph endpoints. Asides are in-page
tokens, not pages. Includes can name source-only endpoints. Navigation and
source directories are not interchangeable graph structures.

## Drafts and publication safety

Default Boris HTML can emit draft pages while omitting them from navigation,
search, feeds, and sitemaps. Draft status does not keep a URL private.
Archived status also does not establish a privacy policy.

The first public-release implementation refuses a source revision containing
draft pages. Publishing the non-draft subset requires a separately reviewed
exclusion design that handles parentage, includes, and references without
leaking draft bodies. A preview is authenticated and isolated.

Static verification files and generated housekeeping use a declared static
input when the selected profile supports it. Do not postprocess compiler-owned
HTML or overwrite compiler-owned artifacts to hide an unsupported feature.
