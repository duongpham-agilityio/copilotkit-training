# Post-Demo Improvements — Overview & Task Index

Date: 2026-08-22
Status: awaiting review
Source design: [`2026-08-22-post-demo-improvements-design.md`](../2026-08-22-post-demo-improvements-design.md)

## Relationship to the source design

The source document holds the **why**: verified platform constraints (§2), why the
hybrid schema won over wholesale replacement (§3), the risk table (§7), the knowledge
checklist (§8). None of that is repeated here.

This folder holds the **how**: one file per task, one branch, one merge. Read the
source once for context, then work from the task file you are on.

The convention follows `2026-08-12-ui-component-library/` — do not merge these back
into a single file.

## Why the split is per mergeable unit, not finer

Each spec's boundary is **one independently mergeable branch**, not one component.
That falls straight out of the overrun defense in §6 of the source design: when time
runs out, the consequence must be *fewer features merged*, not *one half-finished
branch*.

So task 10 (error handling) keeps all four surfaces in one spec even though they are
fairly independent — they share a single decision, "what does an error look like,"
and splitting them means reviewing that decision four times.

Item 6 of the source design goes the other way and **splits into two** (tasks 07 and
08): the platform card is a hard requirement of §3.2, while the comparison grid is
first on the cut list. Bundling them would drag the mandatory half along with the
optional one.

## Execution order

This order is a technical constraint, not a preference.

```
01 spike ──▶ 02 platform model ──┬──▶ 03 threads
                                 ├──▶ 07 platform card ──▶ 08 comparison grid
                                 └──▶ 09 export
                    04 welcome ──┤  (independent)
                05 suggestions ──┤  (independent, but set 3 points at 07/08)
              06 unsupported ────┤  (independent)
             10 error handling ──┘  (independent, except 3B touches 02's two hooks)
```

| # | Task | Estimate | Branch | Hard dependency |
| --- | --- | --- | --- | --- |
| 01 | [Spike: three unknowns](./01-spike-design.md) | 0.75h | `docs/spike-results` | — |
| 02 | [Platform model](./02-platform-model-design.md) — done | 1.3h | `refactor/platform-model` | 01 |
| 03 | [Multiple threads](./03-multiple-threads-design.md) | 2.5h | `feat/multiple-threads` | 01, 02 |
| 04 | [Welcome screen + empty state](./04-welcome-screen-design.md) | 0.7h | `feat/welcome-screen` | — |
| 05 | [Staged suggestions](./05-suggestions-design.md) | 0.5h | `feat/staged-suggestions` | — |
| 06 | [Unsupported features](./06-unsupported-features-design.md) | 1.5h | `feat/unsupported-guardrails` | — |
| 07 | [Platform draft card](./07-platform-draft-card-design.md) | 2.5h | `feat/platform-draft-card` | 02 |
| 08 | [Comparison grid](./08-comparison-grid-design.md) | 1.5h | `feat/platform-comparison-grid` | 07 |
| 09 | [Export](./09-export-design.md) | 0.8h | `feat/export-release-notes` | 02 |
| 10 | [Error handling](./10-error-handling-design.md) | 2.5h | `feat/error-handling` | — |

**Task total: 14.55h.** Plus 2h overhead (0.5h lint/build on day 1, 1h end-to-end
testing, 0.5h final diff read) = **16.55h** — matches §6 of the source design.

Cut order under time pressure, per §6: task 10 part D (runtime banner) → task 06
layer C (wildcard) → task 08 (comparison grid).

## Mapping back to the 7 feedback items

| Feedback item | Task |
| --- | --- |
| 1. Unsupported Features | 06 |
| 2. Welcome Screen | 04 |
| 3. Error Handling | 10 |
| 4. Suggestions | 05 |
| 5. Multiple Threads | 03 |
| 6. Dynamic Platform Rendering (A2UI) | 02 + 07 + 08 |
| 7. Export | 09 |

Item 6 spans three tasks because it is the only item that demands a foundational
architecture change — two other items (07, 09) ride on that same foundation.

## Conventions shared by every task

These apply throughout and are not repeated per file.

**Code style** (`.agents/rules/code-style.md`)
- Arrow functions only, no `function` declarations — React components included
- `import type` for type-only imports (`verbatimModuleSyntax` requires it)
- Explicit `.ts` / `.tsx` extensions on relative and alias imports. The repo is
  currently mixed (`@/constants/agents` without, `@/hooks/use-thread-store.ts` with)
  — **new code always carries the extension**; do not reformat unrelated files
- No `any`. Use `unknown` plus narrowing
- `const enum` for a fixed value set that is both a type and a runtime value
- Zod schema required on every tool's `parameters` — no `z.any()`

**Conventions** (`.agents/rules/conventions.md`)
- Every agent/tool/workflow/scorer must be registered in `src/mastra/index.ts` — the
  most-violated rule in this repo
- Folders are always kebab-case; files are kebab-case except `.tsx` files that
  default-export a component (PascalCase matching the component identifier)
- Constants are SCREAMING_SNAKE_CASE in `src/constants/<purpose>.ts`

**Git** (`.agents/rules/git-rules.md`)
- One task = one `<type>/<description>` branch = one squash-merged PR
- Conventional Commits (commitlint is enabled)
- No direct commits to `main`

**Per-task Definition of Done**
- [ ] `pnpm lint` clean
- [ ] `pnpm build` (`tsc -b && vite build`) clean
- [ ] Affected stories updated, `pnpm build-storybook` runs
- [ ] Every acceptance criterion in that task file checked

The global Definition of Done (end-to-end flow, model smoke test, store migration)
lives in §9 of the source design — verified at the end of day 2, not per task.

## Drift found while reviewing the source

Recorded so the two documents do not diverge:

- **`MarkdownPreview` already has an empty state** ("No content yet — ask Copilot to
  draft release notes…"). §4 Item 2 of the source design describes the Live Preview
  empty state as if it were missing. Task 04 corrects this: only `CommitListPanel` is
  genuinely missing one; the Live Preview side is a copy edit, not new work.
- **`src/lib/export/` already exists** as an empty folder holding a `.gitkeep`. Task
  09 fills a slot that was left open, rather than creating new structure.

## Language

These specs and the strings they propose are in English, matching the repo: every
existing agent instruction (`src/mastra/instructions/*`), tool description, and Zod
`.describe()` is English. The `.describe()` text in task 02 is **prompt content the
model reads**, so its language is a functional decision, not a documentation one.
