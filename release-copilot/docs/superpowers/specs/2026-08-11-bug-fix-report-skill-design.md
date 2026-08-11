# Bug-Fix Report Skill Design

Date: 2026-08-11
Status: Approved

## Purpose

Coding agents fix bugs in this repo without leaving a durable, structured record of
_why_ the bug happened and _why_ the fix is correct. Commit messages capture the
"what"; nothing captures the root cause or the reasoning behind the chosen fix. This
design adds a `bug-fix-report` skill that any coding agent (Claude, or another AGENTS.md
-compliant agent) must invoke at the end of a bug-fix flow, producing one Markdown
report per bug in the repo.

## Audience

Internal dev team reading past fixes during review or when debugging a regression.
Reports may use technical language, code snippets, and `path:line` references freely.

## Scope

**In scope:**

- New skill: `.agents/skills/bug-fix-report/SKILL.md` (mirrored to
  `.claude/skills/bug-fix-report/SKILL.md` per existing skill sync pattern).
- Report template with required sections (below).
- Trigger rule: invoke this skill after a bug fix is verified (build/lint/tests pass),
  before commit/PR — every time, not just for "complex" bugs.
- One line added to `AGENTS.md` telling agents to load this skill after fixing a bug,
  matching the existing `mastra` / `release-notes-copilot` load-instructions pattern.
- Report location convention: `docs/bug-reports/YYYY-MM-DD-<slug>.md`.

**Out of scope:**

- Automating report creation via a git hook or CI check (self-discipline only, same
  posture as `git-rules.md`'s Conventional Commits enforcement).
- Non-bug-fix work (features, refactors) — this skill is bug-fixes only.
- A report index/aggregator page — reports are discovered via the `docs/bug-reports/`
  directory listing; no separate index file to keep in sync.

## Report Template

The skill embeds this template verbatim for the agent to fill in:

```markdown
---
date: YYYY-MM-DD
branch: <branch-name>
commit: <hash, if already committed>
files: [path1, path2]
severity: low | medium | high | critical
---

# <Short descriptive title>

## Summary

1-2 sentences: what the bug was, what it affected.

## Root Cause

The underlying cause, with specific `path:line` references. Describe _why_ the code
was wrong, not the symptom.

## Explanation

How the failure actually occurred: execution path, triggering condition, why it
wasn't caught earlier.

## Solution

The general fix direction (1-2 sentences) and why this direction was chosen over
alternatives.

## Solution Details

Implementation specifics: which files changed and how, before/after code (when
short), why this is a real fix rather than a workaround.

## Verification

Commands run and their results (e.g. `pnpm lint`, `pnpm build`, the specific test that
reproduced the bug and now passes). Must reflect real output, never fabricated.

## Prevention

How to avoid a similar bug (new test, lint rule, review checklist item). Omit this
section if there's nothing substantive to add.
```

## Skill Rules

- All report content is written in English, matching this repo's existing docs/specs
  convention (see `docs/superpowers/specs/*.md`).
- `Root Cause` must cite concrete `path:line` — no vague description.
- The skill must refuse to write a report until the fix is verified (lint/build/tests
  actually run) — `Verification` must report real command output, never assumed
  results, per the repo's `verification-before-completion` posture already in use.
- `severity` is self-assessed by blast radius: data loss/security = critical, minor UI
  glitch = low.
- Report filename slug: kebab-case, matching `.agents/rules/conventions.md` file
  naming conventions.
- This skill runs standalone after `systematic-debugging` completes and the fix is
  verified — it does not modify `systematic-debugging` itself.

## Integration Point

`AGENTS.md` gains one instruction line (alongside the existing `mastra` and
`release-notes-copilot` load instructions):

> After fixing and verifying a bug, load the `bug-fix-report` skill to produce the
> report before committing.

No changes to `.agents/rules/*.md` — this is a skill, not a rule, since it describes a
multi-step authored workflow (template + gating logic) rather than a standing
constraint.

## Testing / Verification Plan

- No runtime code, so no automated tests. Verification is: invoke the skill on a real
  (or synthetic) bug fix in this repo and confirm the generated report follows the
  template, cites real `path:line`, and contains actual verification command output.
