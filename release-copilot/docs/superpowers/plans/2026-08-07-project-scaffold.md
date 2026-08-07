# Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold `release-copilot`'s target folder structure, rewrite `README.md`, fix the `.env` security gap, and add a project-specific Claude skill — no feature logic, docs/structure only.

**Architecture:** Create empty skeleton folders (`.gitkeep`) under `src/` for future feature code, leaving `src/mastra/` untouched. Rewrite `README.md` to describe the real project instead of the Vite template boilerplate. Add `.env.example` and gitignore `.env`. Author a new `.claude/skills/release-notes-copilot/SKILL.md` capturing domain conventions, and point `AGENTS.md` at it.

**Tech Stack:** No new dependencies. Existing stack: React 19, TypeScript, Vite, CopilotKit, Mastra, pnpm.

## Global Constraints

- `src/mastra/` (agents/tools/workflows/index.ts) stays byte-for-byte unchanged — no renaming the weather demo
- Every new folder under `src/` except `mastra/` gets only a `.gitkeep`, no component code
- `configs/` folder is explicitly NOT created (YAGNI — no real config exists yet)
- No GitHub API integration, no `services/github.ts`, no new env var beyond the existing three
- `.env` itself must never be committed — only `.env.example` with placeholder values
- Verification throughout: `pnpm build` and `pnpm lint` must keep passing (they don't touch `src/mastra/`, so this catches accidental breakage anywhere else)

---

### Task 1: Skeleton folders

**Files:**
- Create: `src/routes/.gitkeep`
- Create: `src/pages/.gitkeep`
- Create: `src/layouts/.gitkeep`
- Create: `src/components/chat/.gitkeep`
- Create: `src/components/release-notes/.gitkeep`
- Create: `src/components/platform-selector/.gitkeep`
- Create: `src/providers/.gitkeep`
- Create: `src/hooks/.gitkeep`
- Create: `src/lib/git/.gitkeep`
- Create: `src/services/.gitkeep`
- Create: `src/utils/.gitkeep`
- Create: `src/constants/.gitkeep`
- Create: `src/types/.gitkeep`

**Interfaces:**
- Consumes: nothing
- Produces: the folder tree that Task 3 (README) documents. No code symbols — files are empty.

- [ ] **Step 1: Create all thirteen empty files**

Run:
```bash
mkdir -p src/routes src/pages src/layouts \
  src/components/chat src/components/release-notes src/components/platform-selector \
  src/providers src/hooks src/lib/git src/services src/utils src/constants src/types
touch src/routes/.gitkeep src/pages/.gitkeep src/layouts/.gitkeep \
  src/components/chat/.gitkeep src/components/release-notes/.gitkeep src/components/platform-selector/.gitkeep \
  src/providers/.gitkeep src/hooks/.gitkeep src/lib/git/.gitkeep \
  src/services/.gitkeep src/utils/.gitkeep src/constants/.gitkeep src/types/.gitkeep
```

- [ ] **Step 2: Verify the tree matches the plan**

Run: `find src -type d | sort`
Expected: exactly these 14 directories (13 new + existing `src/mastra` subtree untouched):
```
src
src/assets
src/components
src/components/chat
src/components/platform-selector
src/components/release-notes
src/constants
src/hooks
src/layouts
src/lib
src/lib/git
src/mastra
src/mastra/agents
src/mastra/tools
src/mastra/workflows
src/pages
src/providers
src/routes
src/services
src/types
src/utils
```

- [ ] **Step 3: Confirm mastra untouched**

Run: `git status --porcelain src/mastra` — expected: no output (nothing changed, since git status was `??` for everything pre-existing this is more a sanity check that no file inside got created/modified by the mkdir/touch commands above)

- [ ] **Step 4: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 2: `.env` security fix

**Files:**
- Modify: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Consumes: the three existing keys in `.env` (`GROQ_API_KEY`, `MASTRA_PLATFORM_ACCESS_TOKEN`, `MASTRA_PROJECT_ID`) — read them from the existing untracked `.env` file to know what to template, don't print their values.
- Produces: `.env.example` with the same key names, empty/placeholder values. Task 4 (README) documents these same three keys in its Environment Variables table.

- [ ] **Step 1: Add `.env` to `.gitignore`**

Append to `.gitignore` (after the existing `*.local` line, in the same style as the rest of the file):
```
.env
```

- [ ] **Step 2: Create `.env.example`**

Write `.env.example`:
```
GROQ_API_KEY=
MASTRA_PLATFORM_ACCESS_TOKEN=
MASTRA_PROJECT_ID=
```

- [ ] **Step 3: Verify `.env` is now ignored and `.env.example` is not**

Run: `git check-ignore -v .env && git check-ignore .env.example; echo "exit:$?"`
Expected: first command prints a match against the `.env` line just added; second command (`.env.example`) prints nothing and the final `exit:$?` is `1` (not ignored).

- [ ] **Step 4: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 3: README rewrite

**Files:**
- Modify: `README.md` (full replace of current Vite template content)

**Interfaces:**
- Consumes: folder tree from Task 1, env keys from Task 2, `package.json` dependency list (already read: React 19, TypeScript, Vite, React Router — not yet a dependency, see note below — CopilotKit `@copilotkit/react-core`/`@copilotkit/react-ui`, Mastra `@mastra/core`/`@mastra/libsql`/`@mastra/duckdb`/`@mastra/memory`/`@mastra/observability`, Zod, ESLint, pnpm)
- Produces: nothing consumed by later tasks — this is the terminal doc artifact

Note: `react-router` was chosen in design as the router but is **not yet in `package.json`**. Since installing dependencies is out of this plan's scope (docs/structure only), list it in the Tech Stack section with a `(planned)` marker rather than presenting it as already installed — this keeps the README accurate to the current repo state instead of asserting something `pnpm install` can't yet verify.

- [ ] **Step 1: Write the full README**

Write `README.md`:
```markdown
# Release Notes Copilot

A chat-driven web app that turns raw `git log` output into polished, platform-specific release notes.

## Overview

Paste your `git log` output into the chat, and the copilot classifies commits (feature / fix / breaking change) and generates formatted release notes for the platform you're shipping to — GitHub, App Store/TestFlight, or Google Play. Built on [CopilotKit](https://www.copilotkit.ai/) for the chat interface and [Mastra](https://mastra.ai/) for the underlying agent, tools, and workflow.

## Features

- **Chat-driven UI** — CopilotKit-powered chat panel drives the whole flow, no separate form
- **Git log parsing** — paste raw `git log` text; an agent tool classifies commits into feature/fix/breaking-change buckets
- **Multi-platform output** — generates release notes formatted for GitHub (markdown), App Store/TestFlight (character-limited plain text), and Google Play (plain text)

## Project Structure

```
src/
  main.tsx, App.tsx, App.css, index.css   # app entry
  assets/                                  # static assets
  routes/                                  # React Router route tree
  pages/                                   # route-level page components (HomePage for v1)
  layouts/                                 # page shells (header/nav + outlet)
  components/
    chat/                                  # CopilotKit chat panel wrapper
    release-notes/                         # generated-notes preview/editor
    platform-selector/                     # GitHub / App Store-TestFlight / Google Play picker
  providers/                               # composed React context providers
  hooks/                                   # custom hooks (e.g. release-notes chat state)
  lib/
    git/                                   # framework-agnostic git-log parsing engine
  services/                                # calls into the Mastra backend, isolated from UI
  utils/                                   # small generic helpers
  constants/                               # route paths, platform labels, char limits
  types/                                   # shared Release/Commit/Platform types
  mastra/
    index.ts                               # Mastra instance: agents/tools/workflows registered here
    agents/                                # Mastra agents
    tools/                                 # Mastra tools
    workflows/                             # Mastra workflows
```

Most folders above are currently empty skeletons (`.gitkeep`) — component code lands as features are built.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/) *(planned — not yet installed)*
- [CopilotKit](https://www.copilotkit.ai/) (`@copilotkit/react-core`, `@copilotkit/react-ui`) — chat UI
- [Mastra](https://mastra.ai/) (`@mastra/core`, `@mastra/libsql`, `@mastra/duckdb`, `@mastra/memory`, `@mastra/observability`) — agent framework, storage, observability
- [Zod](https://zod.dev/) — schema validation
- ESLint — linting
- [pnpm](https://pnpm.io/) — package manager

## Getting Started

```bash
# install dependencies
pnpm install

# copy the env template and fill in your values
cp .env.example .env

# start the dev server
pnpm dev
```

Other scripts: `pnpm build` (typecheck + production build), `pnpm lint`, `pnpm preview`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | API key for the Groq-hosted model the Mastra agent uses |
| `MASTRA_PLATFORM_ACCESS_TOKEN` | No | Enables sending observability events to Mastra Platform |
| `MASTRA_PROJECT_ID` | No | Mastra Platform project identifier, used alongside the access token |

Copy `.env.example` to `.env` and fill these in before running `pnpm dev`.
```

- [ ] **Step 2: Verify no leftover template content**

Run: `grep -i "vite\|HMR\|oxc\|swc" README.md`
Expected: no matches except the intentional "Vite" mentions in Tech Stack/Getting Started sections (`Vite`, `pnpm dev`) — i.e. no leftover "React Compiler", "Expanding the ESLint configuration", or plugin-comparison boilerplate from the old template.

- [ ] **Step 3: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 4: `release-notes-copilot` Claude skill

**Files:**
- Create: `.claude/skills/release-notes-copilot/SKILL.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: folder structure from Task 1 (to document where new code goes), platform rules from the design spec
- Produces: nothing consumed by later tasks — terminal artifact

- [ ] **Step 1: Write the skill file**

Write `.claude/skills/release-notes-copilot/SKILL.md`:
```markdown
---
name: release-notes-copilot
description: Domain conventions for the Release Notes Copilot project — git-log commit classification, per-platform release-note formatting rules, and where new code belongs. Use for any work in this repo beyond generic Mastra API usage (covered by the `mastra` skill).
---

# Release Notes Copilot — Project Conventions

This skill covers project-specific domain knowledge. For generic Mastra API usage
(agents, tools, workflows, storage), use the `mastra` skill instead — load both when
doing Mastra work in this repo.

## Git log → commit classification

When parsing raw `git log` output, classify each commit by its message prefix
(Conventional Commits style):

- `feat:` / `feature:` → **Feature**
- `fix:` → **Fix**
- Any prefix followed by `!` (e.g. `feat!:`), or a `BREAKING CHANGE:` footer in the
  commit body → **Breaking change** (takes priority over its base type)
- Anything else (`chore:`, `docs:`, `refactor:`, `test:`, no prefix, etc.) → excluded
  from release notes entirely — these are not user-facing

A single commit can only land in one bucket: Breaking change > Feature > Fix, in that
priority order.

## Per-platform output format rules

| Platform | Format | Constraints |
|---|---|---|
| GitHub | Markdown | Headed sections (`## Features`, `## Fixes`, `## Breaking Changes`), one bullet per commit, no length limit |
| App Store / TestFlight | Plain text | 4000 character limit total ("What's New" field); no markdown syntax; short bullet-style lines using `-` or `•` |
| Google Play | Plain text | 500 character limit for the short release notes field; no markdown; most impactful changes first since it may get truncated |

When a platform's character limit would be exceeded, prioritize Breaking changes,
then Features, then Fixes, and drop lowest-priority items first rather than truncating
mid-sentence.

## Where new code goes

- `src/lib/git/` — pure git-log parsing logic (no React, no Mastra imports) — this is
  where the classification rules above get implemented as testable functions
- `src/mastra/tools/` — Mastra tool wrappers that call into `src/lib/git/` and the
  per-platform formatters; one tool per platform formatter plus the parser tool
- `src/mastra/agents/` — the release-notes agent that orchestrates the tools
- `src/mastra/workflows/` — the end-to-end workflow (parse → classify → format)
- `src/components/chat/` — CopilotKit chat panel UI
- `src/components/release-notes/` — preview/editor for the generated output
- `src/components/platform-selector/` — UI to pick GitHub / App Store-TestFlight / Google Play
- `src/hooks/` — hooks wrapping CopilotKit chat/agent state for the release-notes flow
- `src/services/` — client-side calls into the Mastra backend, kept isolated from UI components
- `src/types/` — shared `Release`/`Commit`/`Platform` types used across the above
```

- [ ] **Step 2: Add pointer in AGENTS.md**

Read `AGENTS.md` first, then add one line under the existing "Load `mastra` skill first" instruction — after the "## CRITICAL: Load `mastra` skill first" section, add:
```markdown

## Load `release-notes-copilot` skill for domain work

For git-log classification rules, per-platform formatting rules, or deciding which
folder new code belongs in, load the `release-notes-copilot` skill.
```

- [ ] **Step 3: Verify the skill is discoverable**

Run: `test -f .claude/skills/release-notes-copilot/SKILL.md && head -5 .claude/skills/release-notes-copilot/SKILL.md`
Expected: prints the YAML frontmatter (`---`, `name:`, `description:`, `---`), confirming the file exists with valid frontmatter.

- [ ] **Step 4: Save a checkpoint**

Save this working increment per your project's version control workflow.

---

### Task 5: Full verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–4
- Produces: nothing — this is the plan's final gate

- [ ] **Step 1: Run build**

Run: `pnpm build`
Expected: exits 0, no TypeScript errors (confirms the new empty folders don't break the `tsc -b` project references and README/skill changes didn't touch any source file incorrectly)

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: exits 0, no new lint errors

- [ ] **Step 3: Confirm `src/mastra` is still byte-identical**

Run: `git diff --stat src/mastra` (or, if not yet tracked, `git status --porcelain src/mastra`)
Expected: no output — zero changes inside `src/mastra/`

- [ ] **Step 4: Final review of full change set**

Run: `git status --porcelain`
Expected: only the files this plan created/modified appear — the 13 `.gitkeep` files,
`.gitignore`, `.env.example`, `README.md`, `.claude/skills/release-notes-copilot/SKILL.md`,
`AGENTS.md`, plus the spec/plan docs under `docs/superpowers/`. No unrelated changes.

- [ ] **Step 5: Save a checkpoint**

Save this working increment per your project's version control workflow.
