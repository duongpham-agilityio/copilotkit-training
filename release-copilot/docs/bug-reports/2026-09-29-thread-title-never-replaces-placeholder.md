---
date: 2026-09-29
branch: fix/thread-title-polling
commit:
files: [src/hooks/use-draft-thread-row.ts, src/hooks/use-thread-session.ts, src/store/draft-thread-store.ts, src/constants/threads.ts, src/components/chat/CopilotAssistantPanel.tsx, src/mastra/agents/release-copilot-agent.ts]
severity: medium
---

# Generated thread title never replaces the placeholder in release history

## Summary

A new chat thread stayed listed under its raw thread id instead of the title
Mastra generates for it. The generated title only appeared after a full page
reload, so the release-history dropdown showed unreadable UUID-style rows for
the whole session.

## Root Cause

`src/hooks/use-draft-thread-row.ts:41-49` (pre-fix) refetched the threads list
exactly once, gated on `isRunning` flipping back to `false`:

```ts
useEffect(() => {
  if (!isDraftInProgress || isRunning) return;

  const threads =
    queryClient.getQueryData<ThreadSummary[]>(THREADS_QUERY_KEY);
  if (threads?.some((thread) => thread.id === threadId)) return;

  void queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
}, [isDraftInProgress, isRunning, threadId, queryClient]);
```

Two things were wrong with it:

1. **The single refetch loses a race it cannot win.** Mastra runs `generateTitle`
   in a promise it does not await, after the response messages are persisted. The
   run therefore finishes — and `isRunning` flips to `false` — *before* the title
   is written. One refetch fired at that moment reliably comes back with the row
   still carrying no generated title.
2. **The early-return condition was the wrong predicate.** `threads?.some(thread
   => thread.id === threadId)` treats "a row exists" as "we are done". But
   `src/hooks/use-draft-thread-row.ts:31-38` itself writes a placeholder row with
   `title: threadId`, so the id was present the whole time. Once any row existed
   the effect returned early and never refetched again.

The second bug masks the first: even if the title landed a moment later, nothing
ever asked the server for it again.

## Explanation

Execution path for a brand-new thread:

1. User sends the first message. `useDraftThreadRow` writes a local placeholder
   row `{ id: threadId, title: threadId }` so the thread appears in history
   immediately.
2. The agent run streams and ends. Mastra persists the messages, then kicks off
   title generation without awaiting it.
3. `isRunning` flips to `false`. The effect above runs, sees a row with a
   matching id (its own placeholder), and returns early. No request is made.
4. Mastra writes the real title server-side a few hundred milliseconds later.
   Nothing on the client is listening, and `THREADS_STALE_TIME_MS` (30s) plus no
   refetch trigger means the list is not re-requested.

The thread kept displaying its id until the next hard reload. It was not caught
earlier because the placeholder makes the list *look* correct during the run —
the row is there, populated, in the right position — and the defect only shows
as a title that never upgrades, which reads as "Mastra did not generate one"
rather than as a client-side fetching bug.

## Solution

Replace the one-shot refetch with a short, self-terminating polling window
opened when a run finishes on a thread that still has no generated title. Polling
was chosen over the alternatives because the title's arrival is not observable
from the client any other way: there is no event for it (Mastra does not emit one
and does not await the promise), and a fixed `setTimeout` guess would either fire
too early on a slow generation or waste time on a fast one. The window is bounded
on both ends so the cost is a request or two, not an open-ended poll.

## Solution Details

**`src/constants/threads.ts`** (new) — the three bounds, shared by the hook that
opens the window and the one that polls: `THREAD_TITLE_POLL_INTERVAL_MS`
(1.5s), `THREAD_TITLE_POLL_WINDOW_MS` (15s hard cap), and `THREAD_ROW_GRACE_MS`
(3s for a server row to appear at all).

**`src/store/draft-thread-store.ts`** — added `pendingTitleThread:
{ id, startedAt } | null` with `markPendingTitle` / `clearPendingTitle`. The
window lives in the store rather than a ref because the producer
(`use-draft-thread-row`) and the consumer (`use-thread-session`, which owns the
threads query) are mounted in different components.

**`src/hooks/use-draft-thread-row.ts`** — now takes the `agent` itself instead of
the destructured `agentThreadId` / `isRunning`, and subscribes to
`onRunFinishedEvent`. The gate changed from "does a row exist" to "does the row
carry a real title":

```ts
if (row?.title && row.title !== finishedThreadId) return;

markPendingTitle({ id: finishedThreadId, startedAt: Date.now() });
```

`row.title !== finishedThreadId` is what distinguishes a generated title from the
placeholder this same hook writes — the exact distinction the old
`some(id === threadId)` check collapsed.

The `AbstractAgent` type is imported from `@copilotkit/react-core/v2`, not from
the direct `@ag-ui/client` dependency: CopilotKit bundles its own copy and the
two declarations have separate private fields, so the other import makes
`useAgent().agent` unassignable.

**`src/hooks/use-thread-session.ts`** — drives the poll via react-query's
`refetchInterval` callback (`src/hooks/use-thread-session.ts:111-115`), which
ignores `staleTime`, so the 30s stale time does not hold it back.
`shouldKeepPollingTitle` stops on any of three conditions: the title arrived, the
15s window expired, or no server row appeared within the 3s grace period. That
last one matters for guardrail-blocked turns — a `tripwire` abort still ends in
`RUN_FINISHED` but persists nothing, so the row will never exist and polling the
full window would spend ten requests on a thread that does not exist. A companion
effect calls `clearPendingTitle()` once polling settles so the window does not
reopen on the next mount.

**`src/mastra/agents/release-copilot-agent.ts`** — `workingMemory.enabled` set to
`false`, and explicit `modelSettings` (`temperature: 0.2`,
`maxOutputTokens: 8000`, `reasoning: 'low'`) on both the primary and fallback
model entries. Working memory was injecting a per-thread block into every request
without being read back anywhere in the release-notes flow, and the pinned
model settings keep the two fallback tiers behaving identically instead of each
inheriting its own provider defaults.

This is a real fix rather than a workaround: the root cause was that nothing
re-queried after the title was written, and the fix makes the client observe the
only window in which the title can appear, with explicit termination on every
path — including the one where the title will never come.

## Verification

Real output from this branch:

- `pnpm lint` — clean, no output beyond the `eslint .` banner, exit 0.
- `pnpm build` — `✓ built in 1.31s`, exit 0. The only warnings are the
  pre-existing `(!) Some chunks are larger than 500 kB after minification`
  chunk-size notices, unrelated to this change.

Per `.agents/rules` this project verifies UI work with lint + build only; there
is no unit-test or Storybook layer to extend.

## Prevention

- The placeholder row and the real row are distinguished only by the convention
  `title === id`. That convention is now encoded in one named helper
  (`hasGeneratedTitle` in `src/hooks/use-thread-session.ts`) instead of being
  re-derived inline at each call site, so the next reader cannot repeat the
  "a row exists, therefore we're done" mistake.
- Rule of thumb worth applying at review time: any client state that depends on
  work a server kicks off but does not await needs a termination condition per
  outcome — arrived, timed out, and will-never-arrive. The original code had none
  of the three. A single `invalidateQueries` after an async trigger should be
  treated as a review smell.
