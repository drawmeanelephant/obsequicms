# Agent rules for Obsequious

Read [the product scope](docs/product.md), [the architecture](docs/architecture.md),
and your assigned [work packet](docs/work-packets.md) before editing.

## Preserve the product boundary

- Obsequious is the application. Boris is an external compiler dependency.
  Do not fork Boris, change its source, or migrate its existing Svelte editor.
- Use React and Astryx for the admin interface. Use published components and
  their documented APIs. Do not copy a second design system into this project.
- Boris remains the authority for document grammar, entity identity,
  parentage, links, includes, validation, rendering, and compiler projections.
  Do not add a JavaScript Markdown-to-HTML pipeline or treat frontmatter as YAML.
- Application-owned source edits require explicit authoring operations.
  A parser, graph resolver, or publication fact inferred in the UI is not a
  replacement for a compiler result.
- Do not create arbitrary content models, generic plugins, or a second compiler
  verification system to complete an initial packet.

## Work within one packet

- Own one branch and only the files listed in your packet.
- Do not edit shared contracts, root dependencies, or another worker's files
  without an agreed handoff. Report a missing dependency rather than improvising.
- Never change Git identity or rewrite shared history. Do not commit build
  trees, caches, binaries, or runtime data. P06 may commit bounded compiler
  test fixtures with provenance.
- Do not create accounts, connect services, publish a site, create a remote repo,
  or push work unless that action is explicitly authorized.
- Do not launch other agents unless your assignment asks for delegation.
- Keep the established stack. Record a proposed change in
  [the decision log](docs/decisions.md) for review before implementing it.

## Make incomplete work visible

- Prototype data must have a persistent "Demo data" label.
- A failed real request never falls back to sample data.
- An unavailable feature shows an explanation and no misleading success action.
- Generated, deployed, and live-verified are different facts.
- A missing, unsupported, stale, failed, or unrun check is not a pass.
- Draft status is not access control. Read the
  [publication warning](docs/boris-integration.md#drafts-and-publication-safety).

## Verify and report

Run the checks assigned to your packet. Do not report commands that you did not
run. Do not weaken a check to make your work pass. Existing tests are not proof
of behavior they do not exercise.

Write `docs/work-reports/Pxx.md` for your own packet. Include changed files,
exact commands and results, observable acceptance evidence, and known gaps.
Do not update a shared progress file from concurrent branches.

Authentication, source mutation, process execution, crawling, and public
publication need the higher-reasoning review gates in the roadmap. A successful
prototype does not waive those gates.
