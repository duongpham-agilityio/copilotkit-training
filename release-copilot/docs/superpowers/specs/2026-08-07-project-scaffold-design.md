# Project Scaffold Design — Release Notes Copilot

Date: 2026-08-07
Status: Approved

## Purpose

`release-copilot` is a chat-driven web app ("Release Notes Copilot") that turns raw
`git log` output into polished, platform-specific release notes. Users paste git log
text into a CopilotKit chat interface; a Mastra agent parses it and produces formatted
output for GitHub, App Store/TestFlight, and Google Play.

This spec covers three non-feature deliverables needed before feature work starts:

1. Target folder structure (skeleton, mostly empty — components land later)
2. `README.md` rewrite
3. A new project-specific Claude skill: `release-notes-copilot`

No agent/tool/workflow logic changes in this pass — `src/mastra/` keeps its current
weather-demo code untouched. It gets replaced with real release-notes logic in a later
pass, once feature work starts.

## Scope

**In scope:**
- Create skeleton folders under `src/` with `.gitkeep` placeholders (no component code)
- Rewrite `README.md`
- Add `.env.example`, fix `.gitignore` to exclude `.env`
- Add `.claude/skills/release-notes-copilot/SKILL.md`

**Out of scope (explicitly deferred):**
- Any actual agent/tool/workflow/component implementation
- Renaming or replacing the weather-agent demo in `src/mastra/`
- `configs/` folder — dropped (YAGNI): nothing to configure yet (no TanStack Query, no
  router config file needed for React Router). Add it back when a real config exists.
- GitHub API integration — v1 takes pasted git log text only, no `services/github.ts`,
  no `GITHUB_TOKEN`
- Version history/archive feature and its storage — deferred past v1

## Folder Structure

```
src/
  main.tsx
  App.tsx
  App.css
  index.css
  assets/
  routes/                          .gitkeep   # React Router route tree
  pages/                           .gitkeep   # HomePage is the only v1 page
  layouts/                         .gitkeep   # AppLayout: header/nav + <Outlet/>
  components/
    chat/                          .gitkeep   # CopilotKit chat panel wrapper
    release-notes/                 .gitkeep   # preview/editor for generated notes
    platform-selector/             .gitkeep   # pick GitHub / App Store-TestFlight / Google Play
  providers/                       .gitkeep   # CopilotKit provider, router provider, composed here
  hooks/                           .gitkeep   # e.g. useReleaseNotes wrapping chat/agent state
  lib/
    git/                           .gitkeep   # pure, framework-agnostic git-log parsing engine
  services/                        .gitkeep   # calls out to Mastra backend, isolated from UI
  utils/                           .gitkeep   # small generic helpers (format, clipboard, etc)
  constants/                       .gitkeep   # route paths, platform labels, char limits
  types/                           .gitkeep   # shared Release/Commit/Platform types
  mastra/                                     # UNCHANGED — current weather demo stays as-is
    index.ts
    agents/weather-agent.ts
    tools/weather-tool.ts
    workflows/weather-workflow.ts
```

`lib/` vs `utils/`: `lib/` holds a cohesive, framework-agnostic domain module (the git-log
parsing engine — no React or Mastra imports, unit-testable standalone). `utils/` holds
small, generic, unrelated helper functions (date formatting, clipboard copy, etc).

Router: React Router (chosen over TanStack Router). Only `HomePage` exists for v1;
`routes/`/`pages/`/`layouts/` are scaffolded now so Settings/History pages have an
obvious home later, without a restructure.

Git log input: user pastes raw `git log` text into chat — no GitHub API call, no
`services/github.ts`, no extra token in v1.

## README.md

Sections, in order:
1. **Title + one-liner** — Release Notes Copilot
2. **Overview** — what it is, why it exists (chat-driven, git log → platform release notes)
3. **Features** — chat UI (CopilotKit), git log parsing, multi-platform output
   (GitHub / App Store-TestFlight / Google Play)
4. **Project Structure** — the tree above, one line per folder explaining its purpose
5. **Tech Stack** — React 19, TypeScript, Vite, React Router, CopilotKit
   (`@copilotkit/react-core`, `@copilotkit/react-ui`), Mastra (`@mastra/core`,
   `@mastra/libsql`, `@mastra/duckdb`, `@mastra/memory`, `@mastra/observability`), Zod,
   ESLint, pnpm
6. **Getting Started** — clone, `pnpm install`, copy `.env.example` → `.env` and fill in
   values, `pnpm dev`
7. **Environment Variables** — table: `GROQ_API_KEY`, `MASTRA_PLATFORM_ACCESS_TOKEN`,
   `MASTRA_PROJECT_ID` (each with one-line description and whether required)

## Environment / Security Fix

- `.env` currently **not** in `.gitignore` — add it (it holds real secrets)
- Add `.env.example` with the same three keys as empty/placeholder values, committed to
  the repo as the template new contributors copy from

## Claude Skill: `release-notes-copilot`

Location: `.claude/skills/release-notes-copilot/SKILL.md` — authored directly here
(not under `.agents/skills` + symlink, since that path is reserved for skills pulled
from an external registry per `skills-lock.json`; this one is hand-authored for this
repo only).

Content covers what the generic `mastra` skill doesn't — project domain knowledge:
- Git-log → conventional-commit mapping (`feat`/`fix`/`breaking` classification)
- Per-platform output format rules: GitHub (markdown), App Store/TestFlight
  (plain text, character-limited), Google Play (plain text, own length limit)
- Where new code goes: maps each folder above to what belongs in it, so future work
  (agent, tool, component) lands in the right place instead of wherever's convenient

`AGENTS.md` gets a one-line addition pointing at the new skill, consistent with how it
already documents the `mastra` skill requirement.

## Testing

No automated tests for this pass — it's scaffolding/docs, not logic. Verification is:
`pnpm build` / `pnpm lint` still pass after the changes, and the README/folder tree
match what's written above.
