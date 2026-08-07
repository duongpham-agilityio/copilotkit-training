---
name: release-notes-copilot
description: Domain conventions for the Release Notes Copilot project — git-log and PR commit classification, per-platform release-note formatting rules, and where new code belongs. Use for any work in this repo beyond generic Mastra API usage (covered by the `mastra` skill).
---

# Release Notes Copilot — Project Conventions

This skill covers project-specific domain knowledge. For generic Mastra API usage
(agents, tools, workflows, storage), use the `mastra` skill instead — load both when
doing Mastra work in this repo.

## Input sources

Users paste one of two things into the chat:

- **Git log** — raw `git log` output, one commit per line/block
- **PR** — a PR title alone, or a PR title + description (markdown body)

Both feed the same classification pipeline below; only the parsing step differs
(`src/lib/git/` vs `src/lib/pr/`).

## Commit / PR → classification

Classify each entry (commit message or PR title) by prefix (Conventional Commits
style):

- `feat:` / `feature:` → **Feature**
- `fix:` → **Fix**
- Any prefix followed by `!` (e.g. `feat!:`), or a `BREAKING CHANGE:` footer/section in
  the commit body or PR description → **Breaking change** (takes priority over its base
  type)
- Anything else with a recognized non-user-facing prefix (`chore:`, `docs:`,
  `refactor:`, `test:`) → excluded from release notes entirely

**PR titles without a Conventional Commits prefix** (common for plain-language PR
titles) fall back to keyword heuristics on the title, then the description if present:

- Contains "fix", "bug", "resolve", "patch" → **Fix**
- Contains "add", "new", "support for", "introduce" → **Feature**
- Contains "remove support", "drop", "no longer", or an explicit "breaking" mention →
  **Breaking change**
- No match → **Feature** (default; a merged PR shipped something worth mentioning
  unless it was clearly filtered out above)

A single entry can only land in one bucket: Breaking change > Feature > Fix, in that
priority order.

## Per-platform output format rules

| Platform | Format | Constraints |
| --- | --- | --- |
| GitHub | Markdown | Headed sections (`## Features`, `## Fixes`, `## Breaking Changes`), one bullet per entry, no length limit |
| App Store / TestFlight | Plain text | 4000 character limit total ("What's New" field); no markdown syntax; short bullet-style lines using `-` or `•` |
| Google Play | Plain text | 500 character limit for the short release notes field; no markdown; most impactful changes first since it may get truncated |

When a platform's character limit would be exceeded, prioritize Breaking changes,
then Features, then Fixes, and drop lowest-priority items first rather than truncating
mid-sentence.

## Where new code goes

- `src/lib/git/` — pure git-log parsing logic (no React, no Mastra imports)
- `src/lib/pr/` — pure PR title/description parsing logic (no React, no Mastra imports)
- both implement the classification rules above as testable functions, sharing a common
  output shape so downstream code (tools, formatters) doesn't care which source it came from
- `src/mastra/tools/` — Mastra tool wrappers that call into `src/lib/git/`, `src/lib/pr/`,
  and the per-platform formatters; one tool per platform formatter plus one parser tool
  per input source
- `src/mastra/agents/` — the release-notes agent that orchestrates the tools
- `src/mastra/workflows/` — the end-to-end workflow (parse → classify → format)
- `src/components/chat/` — CopilotKit chat panel UI
- `src/components/release-notes/` — preview/editor for the generated output
- `src/components/platform-selector/` — UI to pick GitHub / App Store-TestFlight / Google Play
- `src/hooks/` — hooks wrapping CopilotKit chat/agent state for the release-notes flow
- `src/services/` — client-side calls into the Mastra backend, kept isolated from UI components
- `src/types/` — shared `Release`/`Commit`/`Platform` types used across the above
