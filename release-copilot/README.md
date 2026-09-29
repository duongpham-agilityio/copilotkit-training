# Release Notes Builder

A chat-driven web app that turns raw `git log` output or pasted PR titles/descriptions
into polished release notes for whatever destination you name, then archives, exports, or
posts them to Slack.

## Overview

Sign in, paste your `git log` output — or PR titles/descriptions — into the chat panel.
The builder parses and classifies each entry (feature / fix / chore / breaking), reports
a short summary of what it read, and on request drafts release notes for the destination
you name. The draft renders into a Live Preview panel you can copy, export, or archive to
History; asking the builder to send it posts the notes to Slack. Built on
[CopilotKit](https://www.copilotkit.ai/) for the chat interface and
[Mastra](https://mastra.ai/) for the agent, skills, tools, memory, storage, guardrails,
scorers, and observability.

Classification and drafting are done by the agent (LLM) through Mastra **skills**, not by
an in-app parser — the UI is a set of tool-rendered surfaces the agent drives. There is
deliberately **no entry-list view**: parsed entries reach the user only as the agent's
chat summary and as finished release-note content.

## Features

- **Authentication** — Supabase email/password or GitHub OAuth sign-in (`/sign-in`).
  Every route below is gated; the access token is attached to the CopilotKit runtime and
  to each Mastra API call, and the server validates it with `MastraAuthSupabase`.
- **Chat-driven parsing and classification** — paste `git log` output or PR
  titles/descriptions; the agent classifies each entry and answers with a count-by-type
  summary ("5 features, 4 fixes, 1 breaking change"), never a listing of the input.
- **Drafting for any destination** — no fixed platform list. Ask for GitHub, App Store,
  a customer email, Slack, anything — the agent derives the markup, length, and audience
  conventions for the destination it was given, and asks which one to use rather than
  guessing.
- **Live Preview panel** — rendered Markdown / raw Markdown tabs, 1-click Copy, Export,
  Archive, resizable split against the chat panel. The agent renders drafts through the
  `renderReleaseNotesPreview` tool; older draft cards in the thread can be reopened
  without overwriting the newest one.
- **Auto title and release date** — the app builds the title line
  (`Release Notes - #yyyymmdd`) and prepends it; the agent only supplies `releaseDate`
  and an optional `titleOverride`. Omitted date → today in `America/New_York`.
- **Export** — downloads the currently previewed draft (or a History item) as a `.md`
  file.
- **Publish to Slack** — a backend agent tool (`publish-release-notes-to-slack`) posts
  to a Slack Incoming Webhook when the user asks for it, plus a chat suggestion that
  nudges toward asking. History items can also be sent straight from their detail view.
- **Release History** — archive a draft (needs a `version` + `title` from the agent),
  then browse `/history`: search, All / Sent / Not sent filters, recency groups, and a
  per-item detail view with Send to Slack, Copy, Export, and Copy link. Backed by an
  app-owned `releases` collection in LibSQL, scoped per owner.
- **Multiple threads** — sidebar thread list from Mastra memory, thread id in the URL
  (`/?thread=<id>`), Mastra-generated thread titles (polled after a run finishes), and
  New chat.
- **Agent memory** — last 10 messages verbatim plus thread-scoped semantic recall over a
  LibSQL vector index.
- **Guardrails and evals** — prompt-injection and PII input processors before every turn;
  answer-relevancy and hallucination scorers sampled after replies (Studio signal, not a
  gate).
- **Resilience UI** — toasts, error boundaries per panel, connection-error dialog,
  chat-send failure recovery, and a "Coming soon" dialog for the two History actions that
  aren't built yet.

Not implemented yet: History "Open in new thread" and "Remove from history" (no delete
endpoint), and export formats other than Markdown.

## How it works

```text
browser (Vite, :5173)                    Mastra server (:4111)
  Supabase sign-in ─── Bearer token ───▶  MastraAuthSupabase
  CopilotKit chat  ──── /copilotkit ───▶  releaseCopilotAgent
    render tool:                            skills: commit-pr-parsing, classification-rules,
      renderReleaseNotesPreview                     platform-formatting, release-reporting
  services/                                 tools: renderReleaseNotesPreview,
    GET  /api/memory/threads                       publishReleaseNotesToSlack ──▶ Slack webhook
    POST /release-history       ──────────▶  API routes + LibSQL (`releases` collection)
    GET  /release-history[/:id]
    POST /slack/publish         ──────────▶  Slack webhook
```

Both servers must be running — the browser talks to Mastra over
`VITE_COPILOTKIT_RUNTIME_URL` and `VITE_MASTRA_SERVER_URL`.

## Project Structure

```text
src/
  main.tsx, App.tsx, index.css            # entry + app shell, sidebar, thread list, overlays
  routes/
    router.ts                             # React Router config
    AppBootstrap.tsx                      # auth gate / redirects
    SignInPage.tsx                        # Supabase password + GitHub OAuth
    DashboardPage.tsx                     # chat + live preview + export/archive
    HistoryPage.tsx                       # release history list + detail
    RouteErrorPage.tsx
  layouts/                                # AppShell, AppSidebar, DashboardLayout
  components/
    common/                               # UI kit: Button, Badge, Card, Tabs, Toast, dialogs, …
    chat/                                 # CopilotKit panel, message bubbles, thread items
    release-notes/                        # live preview, Markdown/raw views, draft card
    history/                              # history list + detail components
    platform-selector/                    # PlatformTabs (kept for Storybook, not wired)
    **/stories/                           # Storybook stories, colocated per folder
  providers/                              # CopilotKit + React Query providers
  hooks/                                  # auth, threads, draft, preview, history, toast, …
  store/                                  # Zustand: auth, draft workspace, toasts, dialogs
  services/                               # browser-side calls to the Mastra server
  lib/                                    # cn, text, clipboard, download, http client,
                                          # auth service, supabase client, release-notes helpers
  constants/                              # agent/tool/scorer ids, models, endpoints, storage, routes
  types/                                  # draft, release, history, thread, platform types
  icons/, styles/, utils/
  mastra/
    index.ts                              # Mastra instance: agent/tools/auth/routes/storage/observability
    agents/                               # releaseCopilotAgent (model + fallback, memory, scorers)
    skills/                               # parsing, classification, formatting, reporting skills
    instructions/v2/                      # system prompt sections (base, guardrails, release-notes)
    tools/                                # renderReleaseNotesPreview, publishReleaseNotesToSlack
    api/                                  # /copilotkit, /slack/publish, /release-history routes
    storage/                              # LibSQL factory storage, releases collection, vector store
    processors/                           # guardrails + external-context processor
    scorers/                              # answer relevancy + hallucination
    lib/slack/                            # webhook client
docs/
  architecture/                           # app inventory snapshot
  superpowers/specs, superpowers/plans    # design specs + implementation plans
  bug-reports/, daily-log/, learning/     # post-fix reports, work log, notes
  design/                                 # design mockups + theme documentation
```

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/) v8 — routing
- [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`) + `clsx` / `tailwind-merge`
- [CopilotKit](https://www.copilotkit.ai/) (`@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime`) + `@ag-ui/mastra` — chat UI and agent transport
- [Mastra](https://mastra.ai/) (`@mastra/core`, `@mastra/libsql`, `@mastra/memory`, `@mastra/evals`, `@mastra/observability`, `@mastra/auth-supabase`, `@mastra/server`, `@mastra/loggers`) — agent framework, storage, vector recall, scorers, auth, observability
- [Supabase](https://supabase.com/) (`@supabase/supabase-js`) — authentication
- [Zustand](https://zustand.docs.pmnd.rs/) — client state; [TanStack Query](https://tanstack.com/query) — server state
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

# run the app: Vite :5173 + Mastra :4111 together, real Supabase auth
pnpm dev:all
```

`pnpm dev:all` is how the app is run — both servers, one command. The frontend needs the
Mastra server, so starting only `pnpm dev` gives you the UI with a dead chat panel.

### Testing the agent on its own

```bash
# Mastra Studio only — no frontend
pnpm dev:mastra
```

This is for exercising the agent, its tools, and its skills in Mastra Studio without the
app. It sets `MASTRA_AUTH_MODE=simple`, so Studio authenticates with a local testing
token instead of Supabase credentials — which also means it is **not** the Mastra half of
`pnpm dev:all`: the browser app needs the real Supabase auth that `pnpm dev:all` leaves in
place.

## Scripts

| Script                                    | What it does                                            |
| ----------------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                                | Vite dev server (frontend)                              |
| `pnpm dev:mastra`                         | Mastra server alone, simple auth — Studio agent testing |
| `pnpm dev:all`                            | Run the app: Vite + Mastra together, real Supabase auth |
| `pnpm build`                              | `tsc -b` typecheck + production frontend build          |
| `pnpm build:mastra`                       | Mastra production bundle                                |
| `pnpm lint`                               | ESLint over the repo                                    |
| `pnpm format` / `pnpm format:check`       | Prettier write / check                                  |
| `pnpm preview`                            | Preview the built frontend                              |
| `pnpm storybook` / `pnpm build-storybook` | Storybook dev server / static build                     |

## Environment Variables

| Variable                          | Required          | Description                                                                                                        |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `OPENAI_API_KEY`                  | Yes               | API key for the models the agent, guardrails, judge, and embedder use                                              |
| `RELEASE_COPILOT_MODEL`           | Yes               | Primary chat model id (e.g. `openai/gpt-5.6-luna`)                                                                 |
| `RELEASE_COPILOT_FALLBACK_MODEL`  | Yes               | Second model, tried after the primary exhausts its retries. Must differ from the primary                           |
| `RELEASE_COPILOT_GUARDRAIL_MODEL` | Yes               | Model behind the prompt-injection + PII input processors                                                           |
| `RELEASE_COPILOT_JUDGE_MODEL`     | Yes               | Judge model for the answer-relevancy / hallucination scorers. Must differ from the primary                         |
| `RELEASE_COPILOT_EMBEDDING_MODEL` | Yes               | Embedding model behind semantic recall. Changing it invalidates existing embeddings                                |
| `VITE_COPILOTKIT_RUNTIME_URL`     | Yes               | Copilot Runtime endpoint, e.g. `http://localhost:4111/copilotkit`                                                  |
| `VITE_MASTRA_SERVER_URL`          | Yes               | Mastra server base URL used by the browser's service calls, e.g. `http://localhost:4111`                           |
| `VITE_SUPABASE_URL`               | Yes               | Supabase project URL for the browser auth client                                                                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | Yes               | Supabase publishable key (public by design — the boundary is Row Level Security)                                   |
| `SUPABASE_URL`                    | Yes               | Same project, read server-side by `MastraAuthSupabase`                                                             |
| `SUPABASE_PUBLISHABLE_KEY`        | Yes               | Server-side pair of the key above                                                                                  |
| `SLACK_WEBHOOK_URL`               | For Slack publish | Slack Incoming Webhook URL. Must **not** be `VITE_`-prefixed — that would inline the secret into the client bundle |
| `TURSO_DATABASE_URL`              | No                | Remote LibSQL/Turso URL; falls back to a local `file:./mastra.db`                                                  |
| `TURSO_AUTH_TOKEN`                | No                | Auth token paired with `TURSO_DATABASE_URL`                                                                        |
| `MASTRA_PLATFORM_ACCESS_TOKEN`    | No                | Enables sending observability events to Mastra Platform                                                            |
| `MASTRA_PROJECT_ID`               | No                | Mastra Platform project identifier, used alongside the access token                                                |

`VITE_`-prefixed variables are exposed to the browser by Vite; everything else stays
server-side. Copy `.env.example` to `.env` and fill these in before starting either
server — it documents the model choices and cost trade-offs per variable.

## Conventions

Code style, naming, folder responsibilities, and git rules live in
[AGENTS.md](AGENTS.md) and [.agents/rules/](.agents/rules/).
