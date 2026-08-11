# Bug-Fix Report Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `bug-fix-report` skill that any coding agent loads after verifying a
bug fix, producing a structured Markdown report before commit/PR.

**Architecture:** One new skill directory `.agents/skills/bug-fix-report/SKILL.md`,
symlinked into `.claude/skills/bug-fix-report` (matches the existing `mastra` /
`release-notes-copilot` symlink pattern — `.claude/skills` is the runtime-visible
mirror of `.agents/skills`, source of truth lives under `.agents/skills`). One new line
in `AGENTS.md` telling agents when to load it. No application code, no tests to run —
this is a documentation/process artifact. "Testing" means dry-running the skill against
a real fix in this repo and checking the output against the template.

**Tech Stack:** Markdown only. No build/lint impact (these are `.md` files, not
`.ts`/`.tsx` — `pnpm lint`/`pnpm build` don't need to run for this change, but must
still pass clean if this plan is executed alongside other pending code changes).

## Global Constraints

- Report content is written in English (matches `docs/superpowers/specs/*.md`
  convention).
- Skill frontmatter format: `name:` + `description:` only, matching
  `.agents/skills/release-notes-copilot/SKILL.md:1-4`.
- Report path convention: `docs/bug-reports/YYYY-MM-DD-<slug>.md`, slug kebab-case
  (`.agents/rules/conventions.md` file-naming rule).
- Root Cause section must cite concrete `path:line` — no vague description.
- Report must not be written until fix is verified (lint/build/tests actually run) —
  Verification section must contain real command output, never fabricated.
- No git commit/push as part of this plan's steps — per user's global instruction,
  git actions happen only on the user's explicit in-turn request.

---

### Task 1: Write the `bug-fix-report` skill

**Files:**

- Create: `.agents/skills/bug-fix-report/SKILL.md`

**Interfaces:**

- Produces: a skill invokable via `Skill({ skill: "bug-fix-report" })` (or, in other
  agent harnesses, loaded per that harness's skill-loading convention) that supplies
  the report template and the gating/authoring rules below to the invoking agent.

- [ ] **Step 1: Write `SKILL.md` frontmatter + intro**

Content:

```markdown
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
```

- [ ] **Step 2: Append the report template section**

Content (append after Step 1's content):

````markdown
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
````

- [ ] **Step 3: Append authoring rules**

Content (append after Step 2's content):

```markdown
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
```

- [ ] **Step 4: Verify the file renders as expected**

Run: `cat .agents/skills/bug-fix-report/SKILL.md`
Expected: frontmatter (`name:`/`description:`) followed by the four sections
(intro, Report Template, Rules) with no broken code fences (every triple-backtick
opened has a matching close).

- [ ] **Step 5: Save a checkpoint**

Save this working increment per your project's version control workflow (per
global instructions, do not run `git commit` unless the user explicitly asks in
this turn — leave the change staged/unstaged for the user to commit).

---

### Task 2: Expose the skill via `.claude/skills` and wire up `AGENTS.md`

**Files:**

- Create (symlink): `.claude/skills/bug-fix-report` → `../../.agents/skills/bug-fix-report`
- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: `.agents/skills/bug-fix-report/SKILL.md` from Task 1 (must exist before
  the symlink is created).
- Produces: skill discoverable by the Claude Code harness (which reads
  `.claude/skills/`), and an `AGENTS.md` instruction telling any agent to load it.

- [ ] **Step 1: Create the symlink**

Run: `ln -s ../../.agents/skills/bug-fix-report .claude/skills/bug-fix-report`

- [ ] **Step 2: Verify the symlink resolves**

Run: `ls -la .claude/skills/bug-fix-report && cat .claude/skills/bug-fix-report/SKILL.md | head -5`
Expected: symlink target shown as `../../.agents/skills/bug-fix-report`, and the
`cat` prints the frontmatter written in Task 1.

- [ ] **Step 3: Add the load instruction to `AGENTS.md`**

`AGENTS.md` currently reads (relevant excerpt):

```markdown
## Load `release-notes-copilot` skill for domain work

For git-log/PR classification rules, per-platform formatting rules, or deciding which
folder new code belongs in, load the `release-notes-copilot` skill.

## Rules
```

Insert a new section between the `release-notes-copilot` section and `## Rules`:

```markdown
## Load `bug-fix-report` skill after fixing a bug

After fixing and verifying a bug (lint/build/tests actually run and passing), load
the `bug-fix-report` skill to produce the report before committing.
```

- [ ] **Step 4: Verify `AGENTS.md` reads correctly end to end**

Run: `cat AGENTS.md`
Expected: three skill-load sections in order (`mastra`, `release-notes-copilot`,
`bug-fix-report`), each followed by its instruction line, `## Rules` section
unchanged below them.

- [ ] **Step 5: Save a checkpoint**

Save this working increment per your project's version control workflow (no
`git commit` unless the user explicitly asks in this turn).

---

### Task 3: Dry-run the skill against a real fix in this repo

**Files:**

- Create: `docs/bug-reports/<dry-run-date>-<slug>.md` (temporary — see Step 4)

**Interfaces:**

- Consumes: the skill from Task 1, the most recent real bug fix in this repo's
  history (`a780aac fix: reduce Groq rate-limit exposure and tool-call schema
failures`, current HEAD per this session's git status) as the dry-run subject.

- [ ] **Step 1: Load the skill and inspect the fix commit**

Run: `git show a780aac --stat` and `git show a780aac` to see what that commit
actually changed (files + diff).

- [ ] **Step 2: Draft a report for commit `a780aac` using the Task-1 template**

Fill in every section (`Summary`, `Root Cause` with real `path:line` from the diff,
`Explanation`, `Solution`, `Solution Details`, `Verification` — using whatever
lint/build/test evidence is available for that commit, or noting if none is
available since it predates this skill — `Prevention`). Write it to
`docs/bug-reports/2026-08-11-groq-rate-limit-window-dry-run.md`.

- [ ] **Step 3: Check the draft against Task-1's Rules section**

Confirm: `Root Cause` cites real `path:line` (not vague), `severity` is justified by
blast radius, `Verification` doesn't claim unrun commands, filename slug is
kebab-case.

- [ ] **Step 4: Remove the dry-run artifact**

This report is a plan-verification exercise, not a real deliverable — the actual
first real report will be written by an agent after a real future fix. Run:
`rm docs/bug-reports/2026-08-11-groq-rate-limit-window-dry-run.md` and, if
`docs/bug-reports/` is now empty, `rmdir docs/bug-reports` (leave the directory
in place if `rmdir` fails because it's non-empty — that's fine, it just means a
real report should exist there already).

- [ ] **Step 5: Report dry-run result to the user**

Summarize whether the template produced a usable, non-vague report for a real
commit, and flag anything that felt awkward or ambiguous while filling it in — no
code changes needed for this step, just a message to the user before considering
the plan done.
