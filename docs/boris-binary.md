# Approved Boris kits: acquisition and verification

The runtime and real-compiler gates use the platform-specific exact digests in
[`apps/server/src/boris/approved-builds.json`](../apps/server/src/boris/approved-builds.json).
There is no environment-provided digest override or version-only bypass.
Binaries are not committed and must never be downloaded during startup.

## Recorded builds

Both builds use clean source revision
`c50d8622bd407bcb5f559a4d7ed5da440a2259ec`, compiler `boris/0.9.0`,
Zig `0.17.1`, and build-info revision token `c50d8622`.

| Platform / Node key | Compiler SHA-256 |
| --- | --- |
| Linux-x86_64 / `linux-x64` | `b5d72e0751b73e56622b58d3380578aec41a01c463bf50ff6fc0787c5690420a` |
| Darwin-arm64 / `darwin-arm64` | `9d2e3f0a07524ffe479287c8088796b4bb2de497838866734fefda21c6f34d8c` |

Archive name: `boris-agent-kit-c50d8622bd40.tar.gz`.

| Platform | Archive SHA-256 |
| --- | --- |
| Linux-x86_64 | `c90c0beddbae83f847121bf3b53ab227b3890dc1d92544dd118f39e88ba57527` |
| Darwin-arm64 | `39b5be8ef5bd132f5c22495a415de863ae071d62bed7732dd8250cc042900602` |

The original Darwin record remains unchanged in
`apps/server/test/boris/provenance/boris-0.9.0.json`. The Linux entry was added
locally under the authorized M1 implementation, built from the same source pin,
and validated with the full upstream baseline plus real compiler/API/browser
gates. See [the M1 evidence](work-reports/M1.md).

These are separate platform approvals, not a claim of bit-identical builds
across operating systems. Other platforms/architectures remain unsupported
until a build and provenance entry receive their own review.

## Acquire an exact kit

No kit download is published by this project. Obtain the recorded platform's
archive through an existing private handoff. Before executing anything:

1. Check the archive SHA-256 against the table above.
2. Extract into a fresh directory.
3. Inspect `MANIFEST.json`: exact commit, `dirty: false`, platform, Zig version.
4. Verify `SHA256SUMS` and the compiler digest against the platform pin.
5. Check `--version` / `--build-info`, then run both real integration gates.

```sh
shasum -a 256 /absolute/path/to/boris-agent-kit-c50d8622bd40.tar.gz
unpacked="$(mktemp -d)"
tar -xzf /absolute/path/to/boris-agent-kit-c50d8622bd40.tar.gz -C "$unpacked"
cd "$unpacked/boris-agent-kit"
shasum -a 256 -c SHA256SUMS
export BORIS_BIN="$unpacked/boris-agent-kit/bin/boris"
shasum -a 256 "$BORIS_BIN"
"$BORIS_BIN" --version
"$BORIS_BIN" --build-info
# Return to the Obsequious repository:
# BORIS_BIN="$BORIS_BIN" npm run test:boris
# BORIS_BIN="$BORIS_BIN" npm run test:connected
```

Compare the compiler digest with the correct platform row, not merely a
manifest supplied alongside an unknown binary. An old dirty `boris/0.8.2`
binary still fails the pin.

## Reproduce the source build

Use the upstream `scripts/agent-pack.sh` from a clean detached worktree at the
exact source revision. Do not edit Boris or dependency pins to make acquisition
pass. Install official Zig `0.17.1`, verifying the archive digest from
`https://ziglang.org/download/index.json`.

```sh
git -C /absolute/path/to/boris worktree add --detach /absolute/path/to/boris-kit-worktree \
  c50d8622bd407bcb5f559a4d7ed5da440a2259ec
cd /absolute/path/to/boris-kit-worktree
zig build test -j2
zig build -j2
kit_dir="$(mktemp -d)"
scripts/agent-pack.sh --no-build --out "$kit_dir"
```

Two tool-environment details encountered on this Linux machine:

- Zig's documented resolver failure with a newline-less `/etc/resolv.conf` was
  avoided without changing DNS. Exact dependency archives were pre-seeded using
  `zig fetch --save=<name> <local-archive>` **inside a scratch `zig init`
  project**, as Boris's instructions require. The computed package hashes
  matched the unchanged `build.zig.zon` pins.
- The upstream packer uses BSD tar ownership options. With GNU tar it refused
  `--uid`; selecting a local `bsdtar` as `tar` on that invocation's PATH fixed
  packaging without changing the script or installing system packages.

The exact commands, verified tool/package metadata, native build/kit digests,
and earlier failed attempts are in the M1 report and ignored local evidence.
A rebuild is not automatically an approved replacement: a different digest
requires explicit provenance review and real gates, never a relaxed comparison.

## Runtime and gate enforcement

M1 verifies the native executable digest and identity for each fresh project
capture, before compilation. Replacing a previously valid executable with
unapproved bytes fails the next request; a previous success does not authorize
new bytes. Executable symlinks are refused.

`npm run test:boris` exercises the original compiler scenarios and the connected
private API: real nested metadata/edges, exact raw source, located failures and
repair, unsupported profiles/IR, snapshot isolation, source containment,
concurrent reads, revision expiry, size boundaries, and shutdown cleanup.
`npm run test:connected` starts the built native server and real Chromium
against a disposable authored project. A missing/wrong kit fails these explicit
commands; it is never silently skipped or replaced with demo data.

CI does not run those two commands because no approved kit is published.
The standard suite's controlled executable stubs test process boundaries,
not compiler compatibility or a substitute graph.
