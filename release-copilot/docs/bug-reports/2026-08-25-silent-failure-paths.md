---
date: 2026-08-25
branch: practice-one
commit: (not committed)
files:
  [
    src/hooks/use-release-draft.tsx,
    src/mastra/api/slack-publish-route.ts,
    src/lib/uuid.ts,
    src/lib/clipboard.ts,
    src/services/publish-to-slack.ts,
    src/services/list-threads.ts,
    src/components/common/ErrorBoundary.tsx,
    src/components/common/CopyButton.tsx,
    src/hooks/use-chat-error.ts,
    src/hooks/use-runtime-connection.ts,
  ]
severity: high
---

# Every failure path outside Slack publishing failed silently

## Summary

An audit starting from `src/App.tsx` found that error handling existed on exactly one
flow (Slack publishing). Everywhere else a failure either rendered nothing at all, took
the whole app down with a blank screen, or told the user an action had succeeded when it
had not. This report covers the fixes for the six concrete defects found, plus the
missing boundary layer that let two of them escalate to a blank page.

## Root Cause

Six distinct causes, ordered by blast radius:

1. **No error boundary existed anywhere in the tree.** `grep ErrorBoundary src/` returned
   nothing, and `src/routes/router.tsx:4-8` declared no `errorElement`. CopilotKit does
   mount a `CopilotErrorBoundary` inside `<CopilotKit>`, but it re-throws anything that
   is not a `CopilotKitError` (verified in
   `node_modules/@copilotkit/react-core/dist/copilotkit-nRjRp2_5.mjs:10762-10772`), so it
   never covered application render crashes. Any render-phase throw unmounted the tree.

2. **`src/hooks/use-release-draft.tsx:48-58` passed `props.parameters` straight through
   without validating it.** Its sibling `src/hooks/use-commit-entries.tsx:77` does
   `safeParse` on the equivalent payload; this hook did not. `props.parameters` is the
   model's raw JSON via CopilotKit's `partialJSONParse`, so the schema-derived TypeScript
   type is a lie at runtime.

3. **`src/mastra/api/slack-publish-route.ts:25-27` called `await context.req.json()`
   outside the `try` block that started at line 40.** A malformed body threw out of the
   handler entirely.

4. **`src/lib/uuid.ts:1` called `crypto.randomUUID()` unguarded**, and
   `src/store/thread-session-store.ts:19-23` calls it from `onRehydrateStorage`, i.e. at
   module import time.

5. **Two call sites fired `void navigator.clipboard.writeText(...)` with no `catch`** —
   `src/routes/DashboardPage.tsx:18` and `src/hooks/use-slack-publish.tsx:78` — while
   `src/components/common/CopyButton.tsx:28-29` animated to "Copied" unconditionally.

6. **No `fetch` in the app had a timeout.** `src/services/publish-to-slack.ts:23` and
   `src/services/list-threads.ts:22` both awaited indefinitely.

## Explanation

The two escalating paths:

- **Blank screen.** The model omits `platforms` or returns it as an object rather than an
  array. `use-release-draft.tsx` stores it unvalidated; `useReleaseDraftView` then calls
  `buildPlatformOptions` inside a `useMemo`
  (`src/hooks/use-release-draft-view.ts:36-39`), which reaches
  `(draft.platforms ?? []).filter(...)` in `src/lib/release-notes/to-platform-drafts.ts:45`.
  `.filter` on a non-array throws during the render phase. With cause 1 in place, React
  unmounts everything and the user gets a white page with no message.

- **Confident wrong output.** The model omits the required `github` field. Nothing
  validated it, so `composeGithubContent` (`src/lib/release-notes/release-title.ts:33`)
  interpolated it into a template literal and the Live Preview rendered the literal string
  `undefined` as the release notes body.

Neither was caught earlier because both need the model to deviate from a schema the
*server* already enforces — the server tool validates `ReleaseNotesDraftSchema`, so it is
easy to assume the client receives validated data. It does not: the client receives the
raw streamed args, and the two paths are not the same payload.

The remaining four defects share one shape: the failure was routed to `console` or to
nothing, never to the screen. A chat turn that failed was the clearest case — verified at
`@copilotkit/core/dist/index.mjs:4040-4046`, `emitError` only calls `console.error` and
notifies subscribers. CopilotKit renders no default error UI, and nothing in this app
subscribed, so stopping the Mastra server and sending a message produced no visible
reaction at all.

## Solution

Two directions, chosen deliberately:

- **Prefer the framework's own mechanism wherever one exists.** The Mastra and CopilotKit
  APIs were checked before writing anything custom. CopilotKit already tracks runtime
  reachability (`copilotkit.runtimeConnectionStatus` +
  `onRuntimeConnectionStatusChanged`), so the disconnect banner subscribes to that rather
  than probing the server with a hand-rolled `fetch` — no extra request, no polling, and
  no false "disconnected" from a CORS-blocked probe.
- **Write custom code only where the framework genuinely has none.** React exposes no hook
  equivalent of `getDerivedStateFromError`, so the error boundary must be a class
  component; that is the single class in this codebase and it is annotated as such.

## Solution Details

**Validation and server hardening**

- `src/hooks/use-release-draft.tsx` — `ReleaseNotesDraftSchema.safeParse(props.parameters)`,
  matching the pattern already used in `use-commit-entries.tsx`. On failure it keeps the
  `console.warn` for the stack trace and renders a `ToolErrorCard`. The `inProgress` guard
  was kept and is sufficient: only `ToolCallStatus.InProgress` carries `Partial<T>` args
  (verified in `copilotkit-D0aAnD3i.d.mts:2145-2172`), so `Executing`/`Complete` cannot
  produce a false error card mid-stream.
- `src/mastra/api/slack-publish-route.ts` — `context.req.json()` moved inside its own
  `try`, returning a 400 in the same `{ ok, error }` shape the client already parses. A
  `SLACK_WEBHOOK_TIMEOUT_MS` deadline was added to the outbound webhook call, returning 504.
- `src/types/thread.ts` — `ThreadSummary` is now Zod-derived and the threads response is
  `safeParse`d instead of cast with `as`, which previously turned a shape change into an
  empty dropdown showing no message at all.

**Boundaries** — `src/components/common/ErrorBoundary.tsx`, mounted at three depths:
root (`AppProviders`, above `<CopilotKit>` so it catches what CopilotKit re-throws),
per-panel (`DashboardPage`), and inline (header actions). Panel-level is the load-bearing
one: a malformed draft now kills only the preview panel, leaving the chat — the only way
to ask for a corrected draft — alive. `src/routes/RouteErrorPage.tsx` covers
router-level failures, which a React boundary cannot see.

**Surfacing** — `use-chat-error.ts` subscribes to `copilotkit.subscribe({ onError,
onAgentRunStarted })` and renders `ChatErrorBar` with a Retry button. The retry target
comes from `onAgentRunStarted` rather than `copilotkit.getAgent()`, because a chat with a
`threadId` runs a per-thread clone that is deliberately absent from `core.agents`. Retry
is manual only: if the cause is configuration, auto-retry burns tokens and hides the cause.

**Honest feedback** — `src/lib/clipboard.ts` wraps the write and returns a boolean;
`CopyButton` shows "Copy failed" when it gets `false`. `onCopy` accepts
`void | boolean | Promise<void | boolean>` so `void` still counts as success and the eight
existing call sites and stories compile unchanged.

**Timeouts** — both services use `AbortSignal.timeout(FETCH_TIMEOUT_MS)`, and
`src/lib/network-error-message.ts` keeps "timed out" and "could not connect" distinct,
because they send the user down two different fixes.

**Unrelated fix required to run the verification gate:** `eslint.config.js` now ignores
`.mastra`. `pnpm lint` was OOM-crashing (exit 134) on a clean tree before any of this work
— confirmed by stashing all changes and re-running — because ESLint was walking the 1.8 MB
generated `.mastra/output/index.mjs`. `dist` was already ignored; this is the same class of
artifact.

## Verification

- `pnpm lint` — clean, no output. (Before the `eslint.config.js` change it aborted with
  `FATAL ERROR: Ineffective mark-compacts near heap limit`, exit 134, on a stashed clean
  tree as well as on this branch.)
- `pnpm build` (`tsc -b && vite build`) — passed, `✓ built in 1.48s`. The
  "chunks are larger than 500 kB" notice is pre-existing and unrelated.
- `npx tsc -b` re-run after the final change to `use-chat-error.ts` — passed with no output.
- Runtime API claims were verified against installed packages, not from memory:
  `CopilotKitCoreRuntimeConnectionStatus` was confirmed to be a real runtime object by
  importing `@copilotkit/core/dist/index.mjs` in Node and printing it.

**Not yet verified by hand-testing:** the retry button re-running a failed turn, and the
disconnect banner appearing/clearing, both need a running Mastra server. Everything above
is compile- and API-verified only.

## Prevention

- The strongest available guard is a rule that already exists and was simply not applied
  uniformly: *every* payload arriving from the agent must be `safeParse`d at the client
  boundary, because `props.parameters`/`props.args` are streamed model output whose
  TypeScript type is derived from a schema that was never applied to them. Two hooks read
  such a payload; one validated and one did not. Any third one added later should be
  reviewed against this specifically.
- Panel-level error boundaries should be added alongside any new panel, not retrofitted —
  the value is in keeping the chat alive when a render crashes, which is lost if a single
  root boundary is used instead.
- `pnpm lint` OOMing on a clean tree meant the project's own "lint must pass before calling
  work done" gate had been silently unrunnable. Worth treating a crashing gate as a build
  failure rather than an environment quirk.
