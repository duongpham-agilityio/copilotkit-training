---
name: bug-fix-report
description: Produce a structured Markdown report after fixing and verifying a bug — root cause, explanation, solution, and verification evidence. Use after a bug fix is verified (build/lint/tests pass) and before commit/PR, for every bug fix regardless of size.
---

# Bug-Fix Report

Write one report per bug fix to `docs/bug-reports/YYYY-MM-DD-<slug>.md`, where
`<slug>` is a short kebab-case description of the bug (e.g.
`2026-08-11-groq-rate-limit-window.md`). Report content is always in English,
regardless of the conversation language.

**Do not invoke this skill, and do not write a report, until the fix is verified** —
at minimum the relevant lint/build/test commands have actually been run and their
real output observed. Never write a Verification section from assumed or predicted
output.

## Report Template

Fill in every section below. Copy this structure exactly; do not omit a section
without cause (see "Optional sections" below).

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

Commands run and their results (e.g. `pnpm lint`, `pnpm build`, the specific test
that reproduced the bug and now passes). Must reflect real output, never fabricated.

## Prevention

How to avoid a similar bug (new test, lint rule, review checklist item).
```

## Rules

- `Root Cause` must cite concrete `path:line` — never a vague description like "the
  logic was wrong somewhere in the retry handler."
- `severity` is self-assessed by blast radius: data loss/security exposure =
  critical, broken core feature = high, degraded feature with workaround = medium,
  minor/cosmetic = low.
- `Verification` must quote real command output (or a faithful paraphrase of it),
  never predicted or assumed results. If a command wasn't run, don't claim it was.
- `Prevention` may be omitted only when there is genuinely nothing substantive to
  add (e.g. a one-off typo fix) — omitting it to save time when a real prevention
  measure exists (a missing test, a missing validation) is not acceptable.
- Report filename slug: kebab-case, matching the file-naming convention in
  `.agents/rules/conventions.md`.
- This skill runs standalone after debugging/fixing is complete and verified. It
  does not replace or modify the debugging process itself.
