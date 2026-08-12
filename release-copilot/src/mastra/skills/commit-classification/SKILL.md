---
name: commit-classification
description: Use when classifying git-log commits or PR titles/descriptions into Feature, Fix, Breaking change, or excluded categories.
---

> Reference only — not loaded at runtime. These rules are inlined verbatim in
> `src/mastra/agents/release-copilot-agent.ts`; edit both together.

# Commit Classification

Classify each commit message or PR title using Conventional Commits prefixes:

- `feat:` / `feature:` → **Feature**
- `fix:` → **Fix**
- Any prefix followed by `!` (e.g. `feat!:`), or a `BREAKING CHANGE:` footer/section in
  the commit body or PR description → **Breaking change** (takes priority over its
  base type)
- `chore:`, `docs:`, `refactor:`, `test:` → excluded from release notes entirely

## PR titles without a Conventional Commits prefix

Fall back to keyword heuristics on the title, then the description if present:

- Contains "fix", "bug", "resolve", "patch" → **Fix**
- Contains "add", "new", "support for", "introduce" → **Feature**
- Contains "remove support", "drop", "no longer", or an explicit "breaking" mention →
  **Breaking change**
- No match → **Feature** (default — a merged PR shipped something worth mentioning
  unless it was clearly filtered out above)

## Priority

A single entry can only land in one bucket: Breaking change > Feature > Fix, in that
priority order.
