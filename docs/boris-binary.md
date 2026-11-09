# The pinned Boris binary: acquisition, verification, and the gate

The real compiler gate (`npm run test:boris`) runs only against an approved
Boris build whose SHA-256 matches the committed provenance record. This
document explains where the approved build comes from and what the digest
check does and does not establish.

## The pinned baseline

Recorded in
[`apps/server/test/boris/provenance/boris-0.9.0.json`](../apps/server/test/boris/provenance/boris-0.9.0.json)
and enforced (recomputed, not trusted) by the gate:

| Fact | Value |
| --- | --- |
| Compiler id | `boris/0.9.0` |
| Source revision | `c50d8622bd407bcb5f559a4d7ed5da440a2259ec` (clean worktree) |
| Binary SHA-256 | `9d2e3f0a07524ffe479287c8088796b4bb2de497838866734fefda21c6f34d8c` |
| Platform | Darwin-arm64, built with Zig `0.17.1` |
| Kit archive | `boris-agent-kit-c50d8622bd40.tar.gz`, SHA-256 `39b5be8ef5bd132f5c22495a415de863ae071d62bed7732dd8250cc042900602` |

The binary itself is **not** committed to this repository, and it must never
be fetched and executed during application startup.

## How to acquire an approved build

The recorded acquisition path is the upstream handoff kit from
[`drawmeanelephant/boris`](https://github.com/drawmeanelephant/boris) at the
pinned source revision:

```sh
# 1. A detached worktree at the pinned revision (boris source untouched).
git clone https://github.com/drawmeanelephant/boris.git boris-kit
git -C boris-kit worktree add --detach boris-kit-worktree \
  c50d8622bd407bcb5f559a4d7ed5da440a2259ec

# 2. Build the handoff kit inside that worktree (upstream script).
cd boris-kit-worktree
scripts/agent-pack.sh --out /tmp/boris-agent-kit.tar.gz

# 3. Verify the kit archive digest against the provenance record.
shasum -a 256 /tmp/boris-agent-kit.tar.gz
# must print 39b5be8ef5bd132f5c22495a415de863ae071d62bed7732dd8250cc042900602

# 4. Extract and point the gate at the binary.
tar -xzf /tmp/boris-agent-kit.tar.gz -C /tmp
BORIS_BIN=/tmp/boris-agent-kit/bin/boris npm run test:boris
```

Re-verify the binary's digest yourself before trusting any copy:

```sh
shasum -a 256 "$BORIS_BIN"
# must print 9d2e3f0a07524ffe479287c8088796b4bb2de497838866734fefda21c6f34d8c
```

The gate performs the same comparison and fails on mismatch — including a
older dirty `boris/0.8.2` local build, which is **not** accepted evidence
for this baseline. Do not weaken, bypass, or parameterize the digest check.

## Platform restriction (stated honestly)

The approved binary above is a **Darwin-arm64** (macOS Apple silicon) build.
The digest pin accepts exactly that byte sequence and nothing else:

- The digest pin does **not** establish Linux compatibility. A Linux build
  compiled from the same source revision is a different byte sequence; the
  gate will refuse it by design.
- Running the gate on Linux requires a separately reviewed decision: build
  from the pinned revision, evaluate the result, and record a new provenance
  entry (digest, platform, build information) for it. That decision belongs
  to the repository owner, not to a passing test run.
- The gate has run on Darwin-arm64 only. "Bit-identical output across
  operating systems" is not claimed upstream and not tested here.
- CI does not run the real-compiler gate because no pinned binary is
  published; the standard suite (which uses a controlled Node stub, never a
  compiler substitute) runs everywhere.

## What the gate covers

`apps/server/test/boris/compiler-gate.test.ts` proves, against the real
binary: identity and provenance (`--version`/`--build-info` agreement),
indexing valid nested pages, producer edge direction, `check`/`impact`
report bodies (findings, impact, diagnostics), the draft-page HTML behavior,
content-failure classification with located diagnostics and repair,
unsupported-profile refusal, and stale-report refusal. See
[the P06 follow-up report](work-reports/P06-followup.md) for the current
evidence record.
