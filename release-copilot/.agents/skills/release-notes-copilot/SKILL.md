---
name: release-notes-copilot
description: Domain conventions for the Release Notes Copilot project — git-log and PR commit classification, commit selection/filtering, per-platform release-note formatting and export rules, chat-driven drafting/editing, and where new code belongs. Use for any work in this repo beyond generic Mastra API usage (covered by the `mastra` skill).
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

## Commit selection (pre-filter)

After parsing + classification, every entry is shown in a commit list (author, relative
timestamp, monospace hash, `FEAT`/`FIX`/`CHORE` badge) with filter tabs (All / Feat / Fix)
and a per-entry checkbox. Selection happens **before** generation: only checked entries
are sent into release-notes drafting. Unchecking a commit removes it from the pipeline
entirely — it is not merely hidden from an already-generated output. Changing the
selection re-triggers drafting on the new subset.

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
| GitHub | Markdown | Headed sections (`## Features`, `## Fixes`, `## Breaking Changes`), bold section headers, one emoji-prefixed bullet per entry (e.g. `✨`/`🐛`/`💥`), commit IDs rendered as inline code (`` `abc1234` ``), no length limit |
| App Store / TestFlight | Plain text | 4000 character limit total ("What's New" field); no markdown syntax, no emoji bullets; short bullet-style lines using `-` or `•` |
| Google Play | Plain text | 500 character limit for the short release notes field; no markdown; most impactful changes first since it may get truncated |

When a platform's character limit would be exceeded, prioritize Breaking changes,
then Features, then Fixes, and drop lowest-priority items first rather than truncating
mid-sentence.

## Export and copy

The rendered preview (the Markdown/plain-text body per platform above) can be:

- **Copied** — 1-click copy of the exact rendered text for the currently selected platform
- **Exported** — to Markdown (`.md`, GitHub formatting rules), plain text (`.txt`, strips
  markdown/emoji), or JSON (structured `{ platform, sections: [{ type, entries }] }`,
  machine-readable, not the rendered string)

Export always operates on the currently generated draft — it does not re-run
classification or drafting.

## Chat-driven drafting and editing

The AI copilot does two things via chat, not just one:

- **Draft** — generate a full release-notes draft from the currently selected commits for
  the active platform (e.g. "Draft release notes for TestFlight")
- **Edit** — revise the existing draft in place per a natural-language instruction (e.g.
  "Make it sound less technical", "Merge the last two bullets") without re-running
  classification; edits operate on the draft text, not on commit selection

## Where new code goes

- `src/lib/git/` — pure git-log parsing logic (no React, no Mastra imports)
- `src/lib/pr/` — pure PR title/description parsing logic (no React, no Mastra imports)
- both implement the classification rules above as testable functions, sharing a common
  output shape so downstream code (tools, formatters) doesn't care which source it came from
- `src/lib/export/` — pure MD/TXT/JSON export formatting logic (no React, no Mastra
  imports); converts a generated draft into each downloadable format
- `src/mastra/tools/` — Mastra tool wrappers that call into `src/lib/git/`, `src/lib/pr/`,
  and the per-platform formatters; one tool per platform formatter plus one parser tool
  per input source
- `src/mastra/agents/` — the release-notes agent that orchestrates the tools (draft +
  edit-in-place, per the chat-driven drafting rules above)
- `src/mastra/workflows/` — the end-to-end workflow (parse → classify → select → format)
- `src/components/chat/` — CopilotKit chat panel UI
- `src/components/commit-list/` — commit list: badges, filter tabs (All/Feat/Fix),
  per-entry select checkboxes (the pre-filter step above)
- `src/components/release-notes/` — live preview/editor for the generated output, plus
  Copy button and export-format trigger
- `src/components/platform-selector/` — UI to pick GitHub / App Store-TestFlight / Google Play
- `src/hooks/` — hooks wrapping CopilotKit chat/agent state and commit-selection state for
  the release-notes flow
- `src/services/` — client-side calls into the Mastra backend, kept isolated from UI components
- `src/types/` — shared `Release`/`Commit`/`Platform` types (`Commit` includes author,
  timestamp, hash, and classification badge) used across the above
- `src/constants/` — hardcoded literals shared across ≥2 files, or forming an implicit
  contract between decoupled layers (e.g. a Mastra agent registry key that a
  CopilotKit component also references by string). One file per purpose
  (`agents.ts`, `copilotkit.ts`, `storage.ts`, `server.ts`), not a catch-all
  `constants.ts`. See the Constants rule in `.agents/rules/conventions.md` for when
  extraction is (and isn't) warranted — don't extract single-use literals just
  because they look like config.
