# Release Notes Copilot

A chat-driven web app that turns raw `git log` output or pasted PR titles/descriptions into polished, platform-specific release notes.

## Overview

Paste your `git log` output — or PR titles/descriptions — into the chat, and the copilot classifies each entry (feature / fix / breaking change) and generates formatted release notes for the platform you're shipping to — GitHub, App Store/TestFlight, or Google Play. Built on [CopilotKit](https://www.copilotkit.ai/) for the chat interface and [Mastra](https://mastra.ai/) for the underlying agent, tools, and workflow.

## Features

- **Chat-driven UI** — CopilotKit-powered chat panel drives the whole flow, no separate form
- **Git log parsing** — paste raw `git log` text; an agent tool classifies commits into feature/fix/breaking-change buckets
- **PR parsing** — paste a PR title alone, or title + description; classified the same way as git log commits
- **Multi-platform output** — generates release notes formatted for GitHub (markdown), App Store/TestFlight (character-limited plain text), and Google Play (plain text)

## Project Structure

```text
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
    pr/                                    # framework-agnostic PR title/description parsing engine
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
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | API key for the Groq-hosted model the Mastra agent uses |
| `MASTRA_PLATFORM_ACCESS_TOKEN` | No | Enables sending observability events to Mastra Platform |
| `MASTRA_PROJECT_ID` | No | Mastra Platform project identifier, used alongside the access token |

Copy `.env.example` to `.env` and fill these in before running `pnpm dev`.
