# Release Notes Copilot

A chat-driven web app that turns raw `git log` output or pasted PR titles/descriptions into polished, platform-specific release notes.

## Overview

Paste your `git log` output — or PR titles/descriptions — into the chat panel. The
copilot classifies each entry (feature / fix / chore / breaking), renders the parsed
entry list and a live release-notes preview into the app UI, and can then edit the draft
on request or publish it to Slack. Built on [CopilotKit](https://www.copilotkit.ai/) for
the chat interface and [Mastra](https://mastra.ai/) for the agent, tools, storage, and
observability.

Classification and drafting are done by the agent (LLM), not by an in-app parser — the
UI is a set of tool-rendered surfaces the agent drives.

## Features

- **Chat-driven parsing and classification** — paste `git log` output or PR
  titles/descriptions; the agent classifies each entry and pushes the result into the UI
  through the `showEntryList` frontend tool.
- **Entry list** — each entry shows a type badge (`FEAT` / `FIX` / `CHORE` / …), a
  monospace short hash, the author, and a relative timestamp. Filter tabs are generated
  from the types actually present, and clicking a row toggles whether it feeds the
  release notes.
- **Live preview per platform** — a platform switcher (GitHub / App Store / Google Play)
  drives a Markdown preview of the current draft, with 1-click Copy. The agent renders
  drafts through the `renderReleaseNotesPreview` tool.
- **Auto title and release date** — every draft is titled `Release Notes - #yyyymmdd`
  (built in-app, identical across platforms); ask for another date, timezone, or a
  custom title in chat.
- **Platform character limits** — GitHub unlimited, App Store/TestFlight 4000, Google
  Play 500. The title line counts toward the limit.
- **Publish to Slack** — after a draft renders, the copilot offers a confirmation card in
  chat (platform selector + exact preview + Send/Cancel) that posts to a Slack Incoming
  Webhook via a Mastra API route.
- **Persisted chat thread** — the CopilotKit thread id is persisted in localStorage, so
  reloading restores the conversation and its rendered tool surfaces.

Not implemented yet: export to Markdown / plain text / JSON (the header **Export** button
is a placeholder), and the **History** tab (its components exist in Storybook only).

## How it works

```text
browser (Vite, :5173)                 Mastra server (:4111)
  CopilotKit chat  ──── /copilotkit ───▶  releaseCopilotAgent
  frontend tools:                           backend tool:
    showEntryList                             renderReleaseNotesPreview
    confirmSlackPublish                     API route:
    renderReleaseNotesPreview (render)        POST /slack/publish ──▶ Slack webhook
```

Both servers must be running — the browser talks to Mastra over
`VITE_COPILOTKIT_RUNTIME_URL` and `VITE_MASTRA_SERVER_URL`.

## Project Structure

```text
src/
  main.tsx, App.tsx, index.css            # app entry + app shell / nav state
  routes/
    router.tsx                            # React Router config (single `/` route)
    DashboardPage.tsx                     # dashboard: entry list + preview + chat
  layouts/                                # AppShell, AppHeader, SplitPane
  components/
    common/                               # UI kit: Button, Badge, Card, Tabs, Avatar, …
    chat/                                 # CopilotKit chat panel + message bubbles
    commit-list/                          # parsed-entry list, badges, filter tabs
    release-notes/                        # live preview, Markdown renderer, Slack card
    platform-selector/                    # GitHub / App Store / Google Play tabs
    history/                              # release-history components (not wired up yet)
    **/stories/                           # Storybook stories, colocated per folder
  providers/                              # React Query + CopilotKit providers
  hooks/                                  # CopilotKit frontend tools + agent context hooks
  lib/                                    # cn, text, relative time, release-title builder
  services/                               # browser-side calls to the Mastra server
  constants/                              # agent/tool ids, models, storage, server, slack
  types/                                  # Commit, ReleaseEntry, Platform, draft types
  styles/                                 # theme tokens + CopilotKit theme overrides
  mastra/
    index.ts                              # Mastra instance: agent/tool/routes/storage
    agents/                               # releaseCopilotAgent
    tools/                                # renderReleaseNotesPreview
    instructions/                         # agent system prompt, composed from sections
    api/                                  # Slack publish route
    processors/                           # model-compat processors (unused leftover)
docs/
  superpowers/specs, superpowers/plans    # design specs + implementation plans
  bug-reports/                            # post-fix bug reports
  design/                                 # theme documentation
```

`src/lib/git/`, `src/lib/pr/`, `src/lib/export/`, `src/pages/`, `src/utils/` are still
empty placeholders — parsing lives in the agent instructions, and export is not built.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/) — routing
- [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`) + `clsx` / `tailwind-merge`
- [CopilotKit](https://www.copilotkit.ai/) (`@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime`) + `@ag-ui/mastra` — chat UI and agent transport
- [Mastra](https://mastra.ai/) (`@mastra/core`, `@mastra/libsql`, `@mastra/duckdb`, `@mastra/memory`, `@mastra/observability`, `@mastra/loggers`) — agent framework, composite storage, observability
- [Zustand](https://zustand.docs.pmnd.rs/) — thread-id persistence; [TanStack Query](https://tanstack.com/query) — data provider
- [react-markdown](https://github.com/remarkjs/react-markdown), [lucide-react](https://lucide.dev/) — preview rendering and icons
- [Zod](https://zod.dev/) — schema validation
- [Storybook 10](https://storybook.js.org/) — component workshop
- ESLint, Prettier, Husky + lint-staged, commitlint (Conventional Commits)
- [pnpm](https://pnpm.io/) — package manager

## Getting Started

```bash
# install dependencies
pnpm install

# copy the env template and fill in your values
cp .env.example .env

# terminal 1 — Mastra server (agent, /copilotkit, /slack/publish) on :4111
pnpm dev:mastra

# terminal 2 — Vite dev server on :5173
pnpm dev
```

The frontend needs the Mastra server running; starting only `pnpm dev` gives you the UI
with a dead chat panel.

## Scripts

| Script                                    | What it does                                   |
| ----------------------------------------- | ---------------------------------------------- |
| `pnpm dev`                                | Vite dev server (frontend)                     |
| `pnpm dev:mastra`                         | Mastra dev server (agent + API routes)         |
| `pnpm build`                              | `tsc -b` typecheck + production frontend build |
| `pnpm build:mastra`                       | Mastra production bundle                       |
| `pnpm lint`                               | ESLint over the repo                           |
| `pnpm format` / `pnpm format:check`       | Prettier write / check                         |
| `pnpm preview`                            | Preview the built frontend                     |
| `pnpm storybook` / `pnpm build-storybook` | Storybook dev server / static build            |

## Environment Variables

| Variable                         | Required          | Description                                                                                                        |
| -------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `OPENAI_API_KEY`                 | Yes               | API key for the OpenAI-hosted models the agent uses                                                                |
| `RELEASE_COPILOT_MODEL`          | Yes               | Primary model id (e.g. `openai/gpt-5.6-luna`). The server throws on startup if unset                               |
| `RELEASE_COPILOT_FALLBACK_MODEL` | Yes               | Second model, tried after the primary exhausts its retries. Must differ from the primary                           |
| `VITE_COPILOTKIT_RUNTIME_URL`    | Yes               | Copilot Runtime endpoint, e.g. `http://localhost:4111/copilotkit`                                                  |
| `VITE_MASTRA_SERVER_URL`         | Yes               | Mastra server base URL used by the Slack publish call, e.g. `http://localhost:4111`                                |
| `SLACK_WEBHOOK_URL`              | For Slack publish | Slack Incoming Webhook URL. Must **not** be `VITE_`-prefixed — that would inline the secret into the client bundle |
| `TURSO_DATABASE_URL`             | No                | Remote LibSQL/Turso URL; falls back to a local `file:./mastra.db`                                                  |
| `TURSO_AUTH_TOKEN`               | No                | Auth token paired with `TURSO_DATABASE_URL`                                                                        |
| `MASTRA_PLATFORM_ACCESS_TOKEN`   | No                | Enables sending observability events to Mastra Platform                                                            |
| `MASTRA_PROJECT_ID`              | No                | Mastra Platform project identifier, used alongside the access token                                                |

`VITE_`-prefixed variables are exposed to the browser by Vite; everything else stays
server-side. Copy `.env.example` to `.env` and fill these in before starting either
server.

## Conventions

Code style, naming, folder responsibilities, and git rules live in
[AGENTS.md](AGENTS.md) and [.agents/rules/](.agents/rules/).
