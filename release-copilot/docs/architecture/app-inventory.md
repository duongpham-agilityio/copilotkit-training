# App Inventory — Release Notes Copilot

Scan date: 2026-09-29 · Branch: `v2-dev` (`6de7ccb`)

Inventory of what the app **actually** runs: hooks, CopilotKit registrations, server
tools and routes, instructions/skills, storage, and an architecture read-through. This is
a snapshot of the code, not a description of intent — anywhere the code diverges from
`AGENTS.md` / the `release-notes-copilot` skill is called out explicitly (§5.4).

This file replaces the 2026-08-24 snapshot, which described the pre-v2 app (entry list,
fixed 3-platform model, HITL Slack card, no auth, no History) and had drifted past the
point where a partial update was readable.

---

## 1. Custom hooks (`src/hooks/`)

Two kinds: a **registration hook** registers exactly one CopilotKit primitive and must
have exactly one call site app-wide; a **view/utility hook** registers nothing and is safe
to call from anywhere.

### 1.1 Registration hooks (single call site each)

| Hook                                                                                        | Primitive                     | Call site               | What it does                                                                                                                                   |
| ------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `useReleaseDraft` — [use-release-draft.tsx](../../src/hooks/use-release-draft.tsx)          | `useRenderTool`               | `DashboardPage`         | Renders each `renderReleaseNotesPreview` call as a `ReleaseDraftCard`; the newest call syncs into the draft store, older cards can be reopened |
| `useSlackSuggestion` — [use-slack-suggestion.ts](../../src/hooks/use-slack-suggestion.ts)   | `useConfigureSuggestions`     | `DashboardPage`         | One static "Send to Slack" pill, offered only once a draft exists                                                                              |
| `useAgentContext` — [use-agent-context.ts](../../src/hooks/use-agent-context.ts)            | `useAgentContext` (lib)       | `CopilotAssistantPanel` | Ships the currently shown draft to the agent every turn as live context                                                                        |
| `useChatSendFailure` — [use-chat-send-failure.ts](../../src/hooks/use-chat-send-failure.ts) | CopilotKit error subscription | `CopilotAssistantPanel` | Turns "the run started by this message failed" into recoverable UI                                                                             |
| `useDraftThreadRow` — [use-draft-thread-row.ts](../../src/hooks/use-draft-thread-row.ts)    | agent event subscription      | `CopilotAssistantPanel` | Seeds a placeholder thread row (`title: threadId`) and opens the title-polling window                                                          |

### 1.2 View / utility hooks (safe anywhere)

| Hook                               | Reads                              | Note                                                                                                                                        |
| ---------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `useReleaseDraftView`              | draft slice + thread id            | The read-only projection: `draft`, composed `content`, `selectedToolCallId`, `isArchived`. **Never** call `useReleaseDraft` to read a draft |
| `usePreviewPanel`                  | `useReleaseDraftView`              | Opens the Live Preview when a _new_ draft arrives, stays closed after a dismiss                                                             |
| `useIsLatestToolCall`              | agent messages                     | Guards against virtualized re-mounts of an old tool call overwriting the store                                                              |
| `useThreadSession`                 | `GET /api/memory/threads` + stores | Thread list, active id, select/new-chat, generated-title polling                                                                            |
| `useThreadConfig`                  | CopilotKit configuration           | Active thread id; throws when mounted outside `<CopilotKit>`                                                                                |
| `useThreadUrlSync`                 | router                             | One-way URL → CopilotKit sync (reload, pasted link, Back/Forward)                                                                           |
| `useAuth` / `useRuntimeConnection` | auth store / runtime status        | Session + sign-in/out; runtime reachability for `ConnectionErrorDialog`                                                                     |
| `useArchiveRelease`                | mutation → `POST /release-history` | Archives the shown draft, toasts with a "View" action, invalidates History                                                                  |
| `useReleaseHistory`                | `GET /release-history`             | Search, All/Sent/Not-sent filter, recency groups, URL-driven selection                                                                      |
| `useSendReleaseToSlack`            | `POST /slack/publish`              | Sends one archived (version, platform) row from History                                                                                     |
| `useResizablePanel`                | —                                  | Drag/keyboard resize for the preview pane, clamped on read, not persisted                                                                   |
| `useToast` / `useComingSoon`       | stores                             | Toast queue; "not built yet" dialog for disabled buttons                                                                                    |

### 1.3 Library hooks used directly

`useAgent` (`@copilotkit/react-core/v2`) in `CopilotAssistantPanel` and
`useIsLatestToolCall`; `useCopilotChatConfiguration` inside `useThreadConfig`;
`useQuery`/`useMutation`/`useQueryClient` (TanStack Query) inside the service-backed hooks
above.

### 1.4 Client state (`src/store/`, Zustand)

| Store                                                                                                                                                                                    | Persisted                      | Holds                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| [release-workspace-store.ts](../../src/store/release-workspace-store.ts) (= [draft-slice.ts](../../src/store/draft-slice.ts))                                                            | No — deliberate                | `draftByThread[threadId]`: newest `draft`, reopened `selected`, `archivedDraftKeys` |
| [auth-store.ts](../../src/store/auth-store.ts)                                                                                                                                           | No (Supabase owns the session) | `session`, `AuthStatus`                                                             |
| [draft-thread-store.ts](../../src/store/draft-thread-store.ts)                                                                                                                           | No                             | Placeholder thread row + pending-title window                                       |
| [toast-store.ts](../../src/store/toast-store.ts), [coming-soon-store.ts](../../src/store/coming-soon-store.ts), [chat-send-failure-store.ts](../../src/store/chat-send-failure-store.ts) | No                             | Overlay/UI state                                                                    |

The draft store is not persisted on purpose: Mastra's conversation history is the source of
truth and the render tool replays it on reconnect — a second client-side copy is drift,
not safety. `setDraft` no-ops when the serialized draft is unchanged, so a replay can't
reset the panel.

---

## 2. Frontend tool registrations

**One.** `renderReleaseNotesPreview`, via `useRenderTool` in `useReleaseDraft` — no
`description` and no `handler` on the client; the tool definition the model sees comes from
the server (§3). It skips `status === 'inProgress'`, and the store write lives in a child
component's `useEffect`, not in `render()` (bug
[2026-08-19-entry-list-render-side-effect.md](../bug-reports/2026-08-19-entry-list-render-side-effect.md)).

Gone since the previous snapshot: `showEntryList` (the entry-list feature was removed
entirely — see §5.2) and `confirmSlackPublish` (the HITL card was replaced by a backend
tool, §3). `src/types/confirm-slack-publish.ts`, `src/hooks/use-*-tool.tsx`,
`src/components/commit-list/` and `src/lib/release-notes/to-platform-drafts.ts` no longer
exist.

Tool names live in
[src/constants/agent-tools/tools-name.ts](../../src/constants/agent-tools/tools-name.ts) —
an implicit client/agent contract no compiler checks.

---

## 3. Server tools and routes

Registered in both [mastra/index.ts](../../src/mastra/index.ts) (`tools`) and
[release-copilot-agent.ts](../../src/mastra/agents/release-copilot-agent.ts) (`tools`).

| Tool                         | id                               | Schema                                                  | Behavior                                                                                                                                                                                         |
| ---------------------------- | -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `renderReleaseNotesPreview`  | `render-release-notes-preview`   | in: `ReleaseNotesDraftSchema` · out: `{ ok }`           | `execute` is a no-op: the tool exists to put the schema + description in front of the model, validate the draft server-side, and produce a call for the client to render                         |
| `publishReleaseNotesToSlack` | `publish-release-notes-to-slack` | in: `SlackPublishRequestSchema` · out: `{ ok, error? }` | Posts for real via [post-to-slack-webhook.ts](../../src/mastra/lib/slack/post-to-slack-webhook.ts). No confirmation step after the call, so its description forbids speculative and repeat calls |

**Registration key ≠ tool id**: keys are camelCase (`renderReleaseNotesPreview`), ids
kebab-case. The key is what the client subscribes with; a mismatch breaks at runtime, not
at build time.

`ReleaseNotesDraftSchema` ([release-notes-draft.ts](../../src/types/release-notes-draft.ts))
is now **one dynamic destination** — `platform` (kebab-case id), `label`, `content`, plus
`releaseDate` / `titleOverride` / `version` / `title`. No `github`/`appStore`/`googlePlay`
fields, no `platforms[]`, and **no character limits**: the `.max()` caps and
`PLATFORM_CHARACTER_LIMITS` table are gone, the model derives length from the destination it
was given.

### 3.1 API routes

| Route                                              | File                                                                                | Note                                                                                                                                                                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ALL /copilotkit`                                  | [copilotkit-route.ts](../../src/mastra/api/copilotkit-route.ts)                     | `CopilotRuntime` over `MastraAgent.getLocalAgents`, `mode: 'single-route'`; resource id comes from the request context (the signed-in user), and the `authorization` header is stripped before the runtime handler |
| `POST /slack/publish`                              | [slack-publish-route.ts](../../src/mastra/api/slack-publish-route.ts)               | Zod-validated, reads `SLACK_WEBHOOK_URL` (no `VITE_` prefix). Used by the History detail view; the agent uses the tool instead                                                                                     |
| `POST /release-history`                            | [save-release-history-route.ts](../../src/mastra/api/save-release-history-route.ts) | Archive. One platform draft per request, owner-scoped via `requireOwnerId`                                                                                                                                         |
| `GET /release-history`, `GET /release-history/:id` | [release-history-route.ts](../../src/mastra/api/release-history-route.ts)           | Cursor-paginated list + detail, owner-scoped                                                                                                                                                                       |

### 3.2 Auth, storage, observability

- **Auth** — `MastraAuthSupabase` normally; `MASTRA_AUTH_MODE=simple` (set only by
  `pnpm dev:mastra`) swaps in `SimpleAuth` with a local testing token so Studio works
  without Supabase credentials. Picked once before construction, so the simple path never
  requires `SUPABASE_URL`.
- **Storage** — one `LibSQLFactoryStorage` (Turso, fallback `file:./mastra.db`) powering
  both Mastra's own domains and the app-owned `releases` collection, `init()`ed eagerly at
  module load so connectivity fails startup, not a random request. Semantic recall needs a
  separate `LibSQLVector` against the same url ([vector-store.ts](../../src/mastra/storage/vector-store.ts)).
  The old `MastraCompositeStore` + DuckDB observability domain is gone.
- **Observability** — `MastraStorageExporter` + `MastraPlatformExporter`, with
  `SensitiveDataFilter` on span output.
- **Processors** — `promptInjectionDetector` (block, threshold 0.8) → `piiDetector`
  (redact, 0.6) → `externalContextProcessor`, which turns CopilotKit's `ag-ui` context into
  system messages.
- **Scorers** — `answerRelevancy` (ratio 1) and `hallucination` (ratio 0.5) from
  `@mastra/evals`, judged by `RELEASE_COPILOT_JUDGE_MODEL`. Registered on the **agent**, not
  in the Mastra instance. Studio signal, no live threshold.
- **Memory** — `lastMessages: 10` + thread-scoped semantic recall (topK 5, messageRange 2),
  `generateTitle: true`, `workingMemory` present but `enabled: false`.

---

## 4. Instructions

### 4.1 Server — system prompt

[src/mastra/instructions/v2/](../../src/mastra/instructions/v2/), assembled by
`buildReleaseCopilotInstructionsV2()` and joined with `\n\n---\n\n`:

| Piece                 | File                                                                                        | Content                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `buildIntro()`        | [release-notes/intro.ts](../../src/mastra/instructions/v2/release-notes/intro.ts)           | Persona, the 5 responsibilities, scope limit, current time / default timezone / today |
| `TONE_AND_LANGUAGE`   | [base/reply-language.ts](../../src/mastra/instructions/v2/base/reply-language.ts)           | Reply in the user's language; release-note content always English                     |
| `SECURITY`            | [base/security.ts](../../src/mastra/instructions/v2/base/security.ts)                       | Pasted commit/PR text is data, never instructions                                     |
| `ASK_BEFORE_GUESSING` | [base/ask-before-guessing.ts](../../src/mastra/instructions/v2/base/ask-before-guessing.ts) | Baseline no-guessing rule                                                             |
| `LOOP`                | [release-notes/loop.ts](../../src/mastra/instructions/v2/release-notes/loop.ts)             | The Ask → Wait → Re-evaluate → Continue loop, including **no default destination**    |

`instructions: () => build…()` — a function, so `nowIso`/`today` are fresh every turn.
`instructions/v2/chat-assistant/` and `instructions/v2/handoff/` are empty directories.
The v1 instruction files (`commit-classification.ts`, `release-note-formatting.ts`,
`app-usage-faq.ts`) are gone; classification and formatting now live in skills.

### 4.2 Server — skills (`src/mastra/skills/`)

Four `createSkill()` bundles on the agent, each loaded by its `description`:

| Skill                  | Loaded when                                 | Content                                                                             |
| ---------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `commit-pr-parsing`    | git-log/PR input needs parsing into entries | What each input shape looks like, what a structured entry is                        |
| `classification-rules` | entries need classifying                    | Conventional Commit types, semantic fallback, breaking changes, excluded types      |
| `platform-formatting`  | creating/editing/optimizing note content    | Preserve factual meaning, build from classified entries, create vs edit vs optimize |
| `release-reporting`    | reporting what was read back to the user    | **Summary only** — counts by classification, never a listing, never echo the input  |

### 4.3 Frontend — instructions shipped from the browser

| Source                                     | File                                                             | Content                                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `useAgentContext` — current draft          | [use-agent-context.ts](../../src/hooks/use-agent-context.ts)     | The draft shown in the Live Preview; may be a reopened older one; `null` = none yet; the title line is not part of the body                    |
| `.describe()` on `ReleaseNotesDraftSchema` | [release-notes-draft.ts](../../src/types/release-notes-draft.ts) | Server-side, but they are real instructions: never guess `platform`, never write a title line, when to set `releaseDate` / `version` / `title` |

That is the whole frontend contribution now — the two client tool descriptions and the
entry-selection context are gone with the features that owned them.

### 4.4 Boundary summary

|              | Server                                                                        | Frontend                            |
| ------------ | ----------------------------------------------------------------------------- | ----------------------------------- |
| Lives in     | Mastra bundle (`pnpm dev:mastra`)                                             | Vite bundle (`pnpm dev`)            |
| Contains     | 5-piece prompt + 4 skills + 2 tool descriptions + draft-schema `.describe()`s | 1 agent context                     |
| Answers      | _How to parse, classify, format; when to call which tool_                     | _What draft is on screen right now_ |
| Changes when | Mastra server restarts                                                        | Browser reloads                     |

The boundary is clean in v2: the old leak (a server-side FAQ describing UI behavior, at one
point incorrectly) disappeared with `APP_USAGE_FAQ`.

---

## 5. Understanding of the app

### 5.1 One sentence

A gated chat app that turns raw `git log` / PR text into release notes for **any**
destination the user names, then copies, exports, archives, or posts them to Slack — where
the LLM does all the reasoning and the UI is a surface the agent drives through one render
tool.

### 5.2 Core architecture decisions

> Classification and drafting are the agent's job, not a parser's inside the app.

- There is no `src/lib/git/` or `src/lib/pr/` — those stub folders were deleted, not left
  empty. The logic lives in skills, which is also why there is no unit test for it.
- **There is no entry-list view.** The `release-reporting` skill states it outright: parsed
  entries reach the user only as a one-or-two-sentence summary, or as finished note content.
  Removing it deleted the `showEntryList` tool, the commit list UI, selection state, and the
  selection agent context in one move.
- **No default destination.** The draft schema takes one dynamic `platform`, and the loop
  instructions forbid picking one (not even GitHub) when the user named none.
- Zod is a trust boundary, not just a type: it is the only thing that catches a malformed
  draft from the model — though with the length caps gone it now checks shape, not size.
- The UI never generates data: getting a draft means talking to the agent.
- The title line is built by the app ([release-title.ts](../../src/lib/release-notes/release-title.ts)),
  never by the model.

### 5.3 State lifecycle

```
Supabase session (auth-store)
   └─ threadId (CopilotKit configuration, mirrored in the URL `?thread=`)
        └─ releaseWorkspaceStore.draftByThread[threadId]   ← NOT persisted
             ├─ draft     ← newest renderReleaseNotesPreview call
             ├─ selected  ← an older draft card the user reopened
             └─ archivedDraftKeys ← drafts archived this session (Archive button state)
```

Server-side state: threads and messages in Mastra memory, embeddings in the LibSQL vector
index, archived releases in the `releases` collection keyed by `owner_id`.

### 5.4 Where the code diverges from the docs

| Docs say                                                                                             | Code actually does                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `release-notes-copilot` skill: commit selection with checkboxes pre-filters drafting                 | No selection, no entry list at all (§5.2)                                                                               |
| Same skill: fixed GitHub / App Store / Google Play formats, 4000 and 500 char limits enforced by Zod | One dynamic destination, no limits in the schema; the model decides format from the destination name                    |
| Same skill: export to MD / TXT / JSON, `src/lib/export/`                                             | Markdown download only ([download-text-file.ts](../../src/lib/download-text-file.ts)); `src/lib/export/` does not exist |
| Same skill: `src/mastra/workflows/` holds the end-to-end workflow                                    | No workflows exist; the agent + skills are the pipeline                                                                 |
| `conventions.md`: register every scorer in `src/mastra/index.ts`                                     | Scorers are registered on the agent only                                                                                |
| Same skill: `src/components/commit-list/`                                                            | Deleted                                                                                                                 |

### 5.5 Notable structural debt

1. **Legacy platform columns** — `releases` still has `github_body` / `app_store_body` /
   `google_play_body` plus `platforms_json`; new archives write only `platforms`, and
   `ReleaseHistoryRecordSchema` still carries all of them. One row per (version, platform)
   is derived in [use-release-history.ts](../../src/hooks/use-release-history.ts).
2. **`sendStatus` is derived, not stored** — History's "Sent to Slack" badge comes from the
   release status; sending from the detail view invalidates nothing because the backend has
   no per-platform `sentAt`.
3. **Entry-era types still shipped** — `ReleaseEntrySchema`, `CommitType` and
   `entries_json` remain in the repository and history record although nothing writes
   entries any more; `Commit` in [types/commit.ts](../../src/types/commit.ts) is unused.
4. **Dead code** — [ChatSidebar.tsx](../../src/components/chat/ChatSidebar.tsx) (superseded
   by `CopilotAssistantPanel`, still calls the old static-suggestions pattern),
   [Checkbox.tsx](../../src/components/common/Checkbox.tsx),
   [MonoTag.tsx](../../src/components/common/MonoTag.tsx),
   [PlatformTabs.tsx](../../src/components/platform-selector/PlatformTabs.tsx) (Storybook
   only),
   [strip-groq-llama-reasoning.ts](../../src/mastra/processors/strip-groq-llama-reasoning.ts)
   (registered nowhere), empty `src/mastra/public/` and the two empty `instructions/v2/`
   directories.
5. **`workingMemory` is configured but disabled** — the schema in
   [types/working-memory.ts](../../src/types/working-memory.ts) is maintained for a feature
   that is off.
6. **No tests** — verification is `pnpm lint`, `pnpm build`, Storybook. `pnpm format:check`
   currently fails on ~131 pre-existing files.
7. **`DashboardPage` still concentrates registrations** — 2 of the 5 registration hooks
   mount there, the other 3 in `CopilotAssistantPanel`; the single-call-site rule is
   enforced by comments, not by the compiler.

### 5.6 What's done well

- The registration/view hook split keeps a double-registered tool from being possible by
  accident, and every such hook says so at its top.
- Comments explain **why**, with links to the bug report that motivated them.
- `useIsLatestToolCall` + serialized-equality `setDraft` make replay and message
  virtualization safe rather than merely unlikely.
- Owner scoping lives in one helper (`requireOwnerId`) used by all three history routes.
- The suggestion hook documents the CopilotKit trap it avoids (dynamic configs cloning the
  agent and creating throwaway threads).
- Guardrail detection types are trimmed to what this app's data actually needs, with the
  exclusions justified inline.

---

## 6. Checked against the feature spec

Requirements as originally given, re-checked against the code on `v2-dev`.

| Requirement                       | Status | Note                                                                                                                                                                                             |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Commits/PRs parser                | ✅     | Skills, not code (§4.2). The user sees a summary, not an entry list — a deliberate v2 change from the original "parsed entry list" shape                                                         |
| Dynamic-destination release notes | ✅     | Fully in the UI now: one draft per destination, shown in the Live Preview with Preview/Markdown tabs. No platform picker is needed any more — the destination comes from the conversation        |
| Slack sending                     | ✅     | Backend tool, LLM-triggered, plus the "Send to Slack" suggestion; History rows send via `POST /slack/publish`. No HITL confirmation card — the tool description carries the safety rules instead |
| Download                          | ✅     | Markdown only; MD/TXT/JSON is no longer implemented                                                                                                                                              |
| Suggestions by flow               | ⚠️     | Reduced to one draft-dependent "Send to Slack" pill; the 3-stage flow suggestions were dropped with the entry list                                                                               |
| Multiple threads                  | ✅     | Sidebar list, recency groups, URL-linkable, Mastra-generated titles with a bounded polling window                                                                                                |

Added since the spec: authentication, Release History (archive/browse/detail/send),
guardrails, eval scorers, semantic recall, toasts/error boundaries/connection recovery.

Not built: History "Open in new thread" and "Remove from history" (both behind
`ComingSoonDialog` — the second needs a delete endpoint).
