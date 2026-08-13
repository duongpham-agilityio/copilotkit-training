# UI Component Library — Overview

Date: 2026-08-12
Status: Approved

## Purpose

The Figma design (`Release Notes Copilot`, node `0:1`) defines 4 screens — Dashboard,
Copilot Assistant (chat detail), History list, History detail — that the app's real UI
(currently the Vite scaffold in `src/App.tsx`) needs to be rebuilt into. This overview
covers the shared context for a set of small, per-unit specs in this folder, each sized
to land as one independent push (one component, or one tightly-coupled trivial group).
Splitting this way keeps each diff small and trackable, per explicit user instruction —
do not re-merge these back into one file.

Three tiers by generality:

1. **Common** — base, dumb, cross-feature primitives (`src/components/common/`)
2. **Layout** — app structure/chrome, route-agnostic (`src/layouts/`)
3. **Feature** — domain-specific composition of common+layout (`src/components/<feature>/`)

The companion plan (`docs/superpowers/plans/2026-08-12-ui-component-library.md`) builds
these bottom-up: common → layout → shared types → feature, per
[`.agents/rules/conventions.md`](../../../.agents/rules/conventions.md) folder ownership
and the `release-notes-copilot` skill's "Where new code goes" map. Each task in that plan
corresponds 1:1 to one spec file in this folder — see the "Unit index" below.

## Design Correction: theme.md overrides the Figma mock

The Figma mock uses **orange** as its accent (Export/Copy buttons, active tab underline,
the rocket icon, the user chat bubble). [`docs/design/theme.md`](../../../design/theme.md)
— this project's actual design-system source of truth — specifies a **violet** primary
(`--color-primary: #630ed4`) and reserves a violet→indigo gradient
(`--color-ai-gradient-start` / `--color-ai-gradient-end`) exclusively for user-originated
chat bubbles. Every component in this folder is specified against `theme.md`'s tokens
(already wired into Tailwind v4 via `src/styles/theme.css` → `src/index.css` `@theme
inline`), not the Figma screenshot's literal colors. No hardcoded hex or arbitrary
Tailwind values are used anywhere a token exists.

## Scope

**In scope:**

- Common primitives: `Button`, `IconButton`, `Badge`, `Card`, `Tabs`, `Checkbox`, `Input`,
  `Avatar`, `MonoTag`, plus the `cn` classname utility they all share
- Layout: `AppHeader`, `AppShell` (header chrome + content slot, route-agnostic),
  `SplitPane` (generic two-pane grid)
- Shared domain types: `Commit`, `CommitType`, `Platform`, `ReleaseSummary`,
  `ReleaseStatus`
- Feature components for 3 of the 4 skill-documented feature folders —
  `platform-selector/`, `commit-list/`, `release-notes/` — plus a new `history/` folder
- Adding `src/components/history/` to the `release-notes-copilot` skill's folder map

**Out of scope (explicitly deferred):**

- **Custom chat UI** (message bubbles, quick-action pills, raw-git-log block, draft-diff
  card from the "Copilot Assistant" screen). [`ChatSidebar.tsx`](../../../../src/components/chat/ChatSidebar.tsx)
  already delegates its entire UI to CopilotKit's own `CopilotSidebar`, retthemed via
  [`src/styles/copilotkit-theme.css`](../../../../src/styles/copilotkit-theme.css).
  Rebuilding bubbles/inputs as standalone components now would duplicate and likely
  conflict with that working integration. Quick-action pills / generative-UI cards belong
  in a follow-up plan once agent wiring exists.
- **Page assembly / routing.** `AppShell`/`AppHeader` take `activeNav`/`onNavigate` as
  props; they render no `react-router` `Link`/`Route`. Wiring `/dashboard` and `/history`
  routes is a separate follow-up plan.
- **Automated component tests (Vitest/RTL).** Still out of scope — no unit-test runner
  added for this pass.
- ~~Storybook~~ **Reversed 2026-08-12 during implementation, at the user's explicit
  request:** Storybook is now installed (`@storybook/react-vite`, `addon-a11y`,
  `addon-docs` only — the default `storybook init` scaffold also pulled in
  `@storybook/addon-vitest` + Vitest + Playwright browser testing, Chromatic, and an
  MCP addon; all four were removed as unrelated scope creep, keeping the "no
  Vitest/RTL" decision intact). `.storybook/preview.tsx` imports `src/index.css` so
  stories render with real theme tokens. Each component folder gets its own
  `stories/` subfolder (e.g. `src/components/common/stories/Badge.stories.tsx`,
  importing `../Badge.tsx`) rather than co-locating `*.stories.tsx` next to the
  component — every task from here on adds a story under that folder's `stories/`
  alongside its component file. See "Verification strategy" below.
- `@tailwindcss/typography` — not installed; `theme.md` defines its own type scale that
  the plugin's opinionated defaults would fight. `MarkdownPreview` styles markdown
  elements directly with theme tokens instead.
- ~~`clsx` / `tailwind-merge` — not added.~~ **Reversed 2026-08-12 during
  implementation, at the user's explicit request:** both are now installed and `cn`
  (Task 1 / spec `01-cn-util-design.md`) wraps `twMerge(clsx(classes))`. No other task
  changes as a result — every consumer still just calls `cn(...)`.

## Verification strategy

Still no unit-test runner for this pass. Each unit's own spec is verified by:

- `pnpm lint` and `pnpm build` (`tsc -b`) clean — the only automated correctness check in
  this pass, per the project's existing MUST rule in `.agents/rules/code-style.md`
- A Storybook story (CSF3, `<Component>.stories.tsx` under that component's
  `stories/` subfolder — see "Out of scope" above for the reversal): one story export
  per prop-driven visual state (e.g. `Badge`'s `Success`/`Error`/`Warning`/`Neutral`),
  viewed in the running `pnpm storybook` dev server. Each unit's spec below names the
  specific visual detail to check (e.g. "success badge background is `#059669` emerald,
  not orange"). Components with no meaningfully distinct states still get a single
  default-args story, since the story is also this pass's substitute for the
  previously-planned "mount ad hoc in `src/App.tsx`" scratch check.

## File naming note

`.agents/rules/conventions.md` requires non-component `.tsx`/`.ts` files to be
kebab-case. `.tsx` files that default-export a React component use PascalCase (memory
`feedback_file-naming-exception`). Story files (`<Component>.stories.tsx`) follow the
component-file convention — PascalCase matching the component they cover — since they
default-export a `Meta` object describing that component, not a component themselves,
but the pairing with `<Component>.tsx` is the more useful signal to keep obvious at a
glance.

## Unit index

Each row is one push-sized unit — one spec file here, one task in the plan. Order is
build order (dependencies first).

| #   | Unit                     | Spec file                                | Folder                                  |
| --- | ------------------------ | ---------------------------------------- | --------------------------------------- |
| 1   | `cn` util                | `01-cn-util-design.md`                   | `src/lib/`                              |
| 2   | `Badge`                  | `02-badge-design.md`                     | `src/components/common/`                |
| 3   | `Avatar`                 | `03-avatar-design.md`                    | `src/components/common/`                |
| 4   | `MonoTag`                | `04-mono-tag-design.md`                  | `src/components/common/`                |
| 5   | `Button`                 | `05-button-design.md`                    | `src/components/common/`                |
| 6   | `IconButton`             | `06-icon-button-design.md`               | `src/components/common/`                |
| 7   | `Card`                   | `07-card-design.md`                      | `src/components/common/`                |
| 8   | `Tabs`                   | `08-tabs-design.md`                      | `src/components/common/`                |
| 9   | `Checkbox`               | `09-checkbox-design.md`                  | `src/components/common/`                |
| 10  | `Input`                  | `10-input-design.md`                     | `src/components/common/`                |
| 11  | `AppHeader`              | `11-app-header-design.md`                | `src/layouts/`                          |
| 12  | `AppShell`               | `12-app-shell-design.md`                 | `src/layouts/`                          |
| 13  | `SplitPane`              | `13-split-pane-design.md`                | `src/layouts/`                          |
| 14  | Shared types             | `14-shared-types-design.md`              | `src/types/`                            |
| 15  | `PlatformTabs`           | `15-platform-tabs-design.md`             | `src/components/platform-selector/`     |
| 16  | `CommitListItem`         | `16-commit-list-item-design.md`          | `src/components/commit-list/`           |
| 17  | `CommitListPanel`        | `17-commit-list-panel-design.md`         | `src/components/commit-list/`           |
| 18  | `MarkdownPreview`        | `18-markdown-preview-design.md`          | `src/components/release-notes/`         |
| 19  | `LivePreviewPanel`       | `19-live-preview-panel-design.md`        | `src/components/release-notes/`         |
| 20  | `ReleaseHistoryListItem` | `20-release-history-list-item-design.md` | `src/components/history/`               |
| 21  | `ReleaseHistoryList`     | `21-release-history-list-design.md`      | `src/components/history/`               |
| 22  | `ReleaseVersionDetail`   | `22-release-version-detail-design.md`    | `src/components/history/`               |
| 23  | Skill doc sync           | `23-skill-doc-sync-design.md`            | `.claude/skills/release-notes-copilot/` |

Unit 14 (3 tiny type-only files, no independent behavior to review separately) and units
5+6 (`Button`/`IconButton` split — `IconButton` imports `BUTTON_VARIANT_CLASSES` from
`Button.tsx`, but is independently reviewable/testable, so it gets its own push) reflect
the same rule: split down to the smallest unit a reviewer could meaningfully approve or
reject on its own; group only where the pieces have no independent behavior to review.
